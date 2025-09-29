import { ChatInterface } from '@/components/chat/ChatInterface'
import { checkApiHealth } from '@/app/actions'

export default async function ChatPage() {
  // Check API health on page load
  const health = await checkApiHealth()

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-600 mt-1">
            Powered by LangChain and streaming responses
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div
            className={`w-3 h-3 rounded-full ${
              health.healthy ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {health.healthy ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="flex-1 p-6">
        <ChatInterface />
      </div>
    </div>
  )
}