'use server'

import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'
import { Readable } from 'stream'

// Define the service types
interface AgentService {
  streamAgentResponse: (
    request: AgentRequest,
    callback?: (error: grpc.ServiceError | null, response?: any) => void
  ) => grpc.ClientReadableStream<AgentResponse>
}

interface AgentRequest {
  query: string
  conversation_id?: string
  metadata?: Record<string, string>
}

interface AgentResponse {
  event?: {
    chunk?: string
    tool_call?: ToolCall
    thought?: string
    error?: string
    done?: boolean
  }
  timestamp?: number
}

interface ToolCall {
  tool_name: string
  tool_input: string
  tool_output: string
  status: string
}

// Load the protobuf definition
const PROTO_PATH = path.join(process.cwd(), '../../packages/proto/service.proto')

let client: AgentService | null = null

function getGrpcClient(): AgentService {
  if (client) return client

  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  
  // Get the gRPC URL from environment or use default
  const grpcUrl = process.env.GRPC_URL || 'localhost:50051'
  
  client = new proto.proto.AgentService(
    grpcUrl,
    grpc.credentials.createInsecure()
  ) as AgentService

  return client
}

export async function* streamAgentResponseAction(
  query: string,
  conversationId?: string
): AsyncGenerator<AgentResponse, void, unknown> {
  const client = getGrpcClient()
  
  const request: AgentRequest = {
    query,
    conversation_id: conversationId,
    metadata: {
      timestamp: Date.now().toString(),
      source: 'web'
    }
  }

  // Create a promise that will handle the streaming response
  const streamPromise = new Promise<AsyncGenerator<AgentResponse, void, unknown>>((resolve, reject) => {
    try {
      const call = client.streamAgentResponse(request)
      
      // Convert the gRPC stream to an async generator
      async function* responseGenerator(): AsyncGenerator<AgentResponse, void, unknown> {
        const chunks: AgentResponse[] = []
        let isComplete = false

        // Set up event handlers
        call.on('data', (response: AgentResponse) => {
          chunks.push(response)
        })

        call.on('error', (error: grpc.ServiceError) => {
          console.error('gRPC stream error:', error)
          chunks.push({
            event: { error: error.message },
            timestamp: Date.now()
          })
          isComplete = true
        })

        call.on('end', () => {
          isComplete = true
        })

        // Yield chunks as they arrive
        while (!isComplete || chunks.length > 0) {
          if (chunks.length > 0) {
            const chunk = chunks.shift()!
            yield chunk
          } else {
            // Wait a bit for more chunks
            await new Promise(resolve => setTimeout(resolve, 10))
          }
        }
      }

      resolve(responseGenerator())
    } catch (error) {
      reject(error)
    }
  })

  const generator = await streamPromise
  yield* generator
}

// Alternative implementation using ReadableStream for client components
export async function createAgentResponseStream(
  query: string,
  conversationId?: string
): Promise<ReadableStream<string>> {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const response of streamAgentResponseAction(query, conversationId)) {
          const message = JSON.stringify(response) + '\n'
          controller.enqueue(encoder.encode(message))
        }
      } catch (error) {
        console.error('Stream error:', error)
        controller.error(error)
      } finally {
        controller.close()
      }
    }
  })
}

// Health check action
export async function checkApiHealth(): Promise<{ healthy: boolean; message: string }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/health`)
    if (response.ok) {
      const data = await response.json()
      return { healthy: true, message: data.message || 'API is healthy' }
    }
    return { healthy: false, message: 'API returned non-OK status' }
  } catch (error) {
    return { healthy: false, message: `Failed to connect to API: ${error}` }
  }
}