'use client'

import { useState, useEffect } from 'react'
import { saveApiKeys, getApiKeys, testApiKey } from './actions'

interface ApiKeyConfig {
  provider: string
  key: string
  isValid?: boolean
  lastTested?: string
}

const API_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', envVar: 'OPENAI_API_KEY', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', envVar: 'ANTHROPIC_API_KEY', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google AI', envVar: 'GOOGLE_API_KEY', placeholder: 'AIza...' },
  { id: 'meta', name: 'Meta (Llama)', envVar: 'META_API_KEY', placeholder: 'meta-...' },
]

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadApiKeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const keys = await getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load API keys' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await saveApiKeys(apiKeys)
      setMessage({ type: 'success', text: 'API keys saved successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API keys' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (providerId: string) => {
    if (!apiKeys[providerId]?.key) {
      setMessage({ type: 'error', text: 'Please enter an API key first' })
      return
    }

    setTesting(providerId)
    setMessage(null)
    try {
      const result = await testApiKey(providerId, apiKeys[providerId].key)
      setApiKeys(prev => ({
        ...prev,
        [providerId]: {
          ...prev[providerId],
          isValid: result.valid,
          lastTested: new Date().toISOString()
        }
      }))
      setMessage({
        type: result.valid ? 'success' : 'error',
        text: result.message
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test API key' })
    } finally {
      setTesting(null)
    }
  }

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }))
  }

  const updateApiKey = (providerId: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [providerId]: {
        provider: providerId,
        key: value,
        isValid: undefined,
        lastTested: undefined
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading API keys...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">API Keys Configuration</h1>
        <p className="text-gray-400 mt-2">
          Configure your API keys for various AI providers. Keys are encrypted and stored securely.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {API_PROVIDERS.map((provider) => {
          const config = apiKeys[provider.id] || { provider: provider.id, key: '' }
          const isShown = showKeys[provider.id]
          
          return (
            <div key={provider.id} className="bg-gray-900 rounded-lg border border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-gray-100">{provider.name}</h3>
                  {config.isValid !== undefined && (
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        config.isValid
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {config.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  )}
                </div>
                <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                  {provider.envVar}
                </code>
              </div>

              <div className="space-y-3">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type={isShown ? 'text' : 'password'}
                      value={config.key}
                      onChange={(e) => updateApiKey(provider.id, e.target.value)}
                      placeholder={provider.placeholder}
                      className="w-full px-4 py-2 pr-10 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {isShown ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => handleTest(provider.id)}
                    disabled={testing === provider.id || !config.key}
                    className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testing === provider.id ? 'Testing...' : 'Test'}
                  </button>
                </div>
                {config.lastTested && (
                  <p className="text-xs text-gray-400">
                    Last tested: {new Date(config.lastTested).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-end space-x-3">
        <button
          onClick={loadApiKeys}
          className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Keys'}
        </button>
      </div>
    </div>
  )
}