'use client'

import { useState, useEffect } from 'react'
import { 
  saveEnvironmentGroups, 
  getEnvironmentGroups, 
  testConnection,
  deleteGroup,
  exportGroups,
  importGroups
} from './actions'

interface EnvironmentVariable {
  id: string
  key: string
  value: string
  description?: string
  isSecret: boolean
}

interface EnvironmentGroup {
  id: string
  name: string
  description?: string
  icon?: string
  variables: EnvironmentVariable[]
  createdAt: string
  updatedAt: string
}

const DEFAULT_GROUPS = [
  { id: 'database', name: 'Database', icon: '🗄️', description: 'Database connection settings' },
  { id: 'ai-providers', name: 'AI Providers', icon: '🤖', description: 'AI service API keys' },
  { id: 'netsuite', name: 'NetSuite', icon: '📊', description: 'NetSuite integration credentials' },
]

export default function EnvironmentPage() {
  const [groups, setGroups] = useState<EnvironmentGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileGroupsOpen, setMobileGroupsOpen] = useState(false)

  useEffect(() => {
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const loadedGroups = await getEnvironmentGroups()
      // Initialize with default groups if empty
      if (loadedGroups.length === 0) {
        const initialGroups = DEFAULT_GROUPS.map(g => ({
          ...g,
          variables: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        setGroups(initialGroups)
        setSelectedGroup(initialGroups[0]?.id || null)
      } else {
        setGroups(loadedGroups)
        setSelectedGroup(loadedGroups[0]?.id || null)
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load environment groups' })
      // Initialize with defaults on error
      const initialGroups = DEFAULT_GROUPS.map(g => ({
        ...g,
        variables: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      setGroups(initialGroups)
      setSelectedGroup(initialGroups[0]?.id || null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await saveEnvironmentGroups(groups)
      setMessage({ type: 'success', text: 'Environment variables saved successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save environment variables' })
    } finally {
      setSaving(false)
    }
  }

  const addGroup = () => {
    if (!newGroupName.trim()) return
    
    const newGroup: EnvironmentGroup = {
      id: newGroupName.toLowerCase().replace(/\s+/g, '-'),
      name: newGroupName,
      icon: '📁',
      variables: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    setGroups([...groups, newGroup])
    setSelectedGroup(newGroup.id)
    setNewGroupName('')
    setEditingGroup(null)
  }

  const removeGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group and all its variables?')) {
      try {
        await deleteGroup(groupId)
        setGroups(groups.filter(g => g.id !== groupId))
        if (selectedGroup === groupId) {
          setSelectedGroup(groups[0]?.id || null)
        }
        setMessage({ type: 'success', text: 'Group deleted successfully' })
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete group' })
      }
    }
  }

  const addVariable = (groupId: string) => {
    const newVar: EnvironmentVariable = {
      id: crypto.randomUUID(),
      key: '',
      value: '',
      isSecret: false,
    }
    
    setGroups(groups.map(g => 
      g.id === groupId 
        ? { ...g, variables: [...g.variables, newVar], updatedAt: new Date().toISOString() }
        : g
    ))
  }

  const updateVariable = (groupId: string, varId: string, field: keyof EnvironmentVariable, value: any) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? {
            ...g,
            variables: g.variables.map(v => 
              v.id === varId ? { ...v, [field]: value } : v
            ),
            updatedAt: new Date().toISOString()
          }
        : g
    ))
  }

  const removeVariable = (groupId: string, varId: string) => {
    setGroups(groups.map(g => 
      g.id === groupId 
        ? {
            ...g,
            variables: g.variables.filter(v => v.id !== varId),
            updatedAt: new Date().toISOString()
          }
        : g
    ))
  }

  const toggleShowValue = (varId: string) => {
    setShowValues(prev => ({ ...prev, [varId]: !prev[varId] }))
  }

  const testDatabaseConnection = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return

    const pooledUrl = group.variables.find(v => v.key === 'DATABASE_URL_POOLED')?.value
    const directUrl = group.variables.find(v => v.key === 'DATABASE_URL_DIRECT')?.value

    if (!pooledUrl && !directUrl) {
      setMessage({ type: 'error', text: 'No database URL found in this group' })
      return
    }

    try {
      const result = await testConnection(pooledUrl || directUrl || '')
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' })
    }
  }

  const handleExport = async () => {
    try {
      const exported = await exportGroups(groups)
      const blob = new Blob([exported], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `environment-variables-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Environment variables exported' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export environment variables' })
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const content = await file.text()
      const imported = await importGroups(content)
      setGroups(imported)
      setMessage({ type: 'success', text: 'Environment variables imported successfully' })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to import environment variables' })
    }
  }

  const currentGroup = groups.find(g => g.id === selectedGroup)
  const filteredVariables = currentGroup?.variables.filter(v => 
    v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading environment variables...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Environment Variables</h1>
        <p className="text-sm sm:text-base text-gray-400 mt-2">
          Manage your application environment variables and credentials. Values are encrypted and stored securely.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/20 text-green-400 border border-green-800'
              : 'bg-red-900/20 text-red-400 border border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Mobile Group Selector */}
      <div className="lg:hidden mb-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Select Group</label>
          <div className="relative">
            <select
              value={selectedGroup || ''}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full appearance-none px-3 py-2 pr-10 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
              style={{ fontSize: '16px' }} // Prevents zoom on iOS
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.icon} {group.name} ({group.variables.length})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Groups Sidebar - Hidden on mobile */}
        <div className="hidden lg:block w-full lg:w-80 bg-gray-900 rounded-lg border border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-100">Groups</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="p-2 text-gray-400 hover:text-gray-200"
                  title="Export"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <label className="p-2 text-gray-400 hover:text-gray-200 cursor-pointer" title="Import">
                  <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </label>
              </div>
            </div>
            
            {editingGroup === 'new' ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addGroup()}
                  autoFocus
                />
                <button
                  onClick={addGroup}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setEditingGroup(null)
                    setNewGroupName('')
                  }}
                  className="px-3 py-2 border border-gray-700 rounded-lg text-sm text-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingGroup('new')}
                className="w-full px-3 py-2 border border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-200 text-sm"
              >
                + Add Group
              </button>
            )}
          </div>

          <div className="p-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-indigo-900 text-indigo-300'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
                onClick={() => setSelectedGroup(group.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-xl">{group.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{group.name}</div>
                    {group.description && (
                      <div className="text-xs text-gray-500">{group.description}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {group.variables.length} variable{group.variables.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                {!['database', 'ai-providers'].includes(group.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeGroup(group.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Variables Panel */}
        <div className="flex-1 min-w-0 bg-gray-900 rounded-lg border border-gray-800">
          {currentGroup ? (
            <>
              <div className="p-4 sm:p-6 border-b border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">{currentGroup.icon}</span>
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-100">{currentGroup.name}</h2>
                      {currentGroup.description && (
                        <p className="text-xs sm:text-sm text-gray-400">{currentGroup.description}</p>
                      )}
                    </div>
                  </div>
                  {currentGroup.id === 'database' && (
                    <button
                      onClick={() => testDatabaseConnection(currentGroup.id)}
                      className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-700"
                    >
                      Test Connection
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search variables..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg"
                  />
                  <button
                    onClick={() => addVariable(currentGroup.id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                  >
                    Add Variable
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-4 max-h-[600px] overflow-y-auto overflow-x-hidden">
                {filteredVariables?.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    {searchTerm ? 'No variables found matching your search' : 'No variables in this group yet'}
                  </div>
                ) : (
                  filteredVariables?.map((variable) => (
                    <div key={variable.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 sm:p-4">
                      <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4">
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Key
                          </label>
                          <input
                            type="text"
                            value={variable.key}
                            onChange={(e) => updateVariable(currentGroup.id, variable.id, 'key', e.target.value)}
                            placeholder="VARIABLE_NAME"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg text-sm font-mono"
                          />
                        </div>
                        
                        <div className="sm:col-span-5">
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Value
                          </label>
                          <div className="relative">
                            <input
                              type={variable.isSecret && !showValues[variable.id] ? 'password' : 'text'}
                              value={variable.value}
                              onChange={(e) => updateVariable(currentGroup.id, variable.id, 'value', e.target.value)}
                              placeholder="Value"
                              className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-700 text-gray-100 rounded-lg text-sm"
                            />
                            {variable.isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleShowValue(variable.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                              >
                                {showValues[variable.id] ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row items-end gap-3 sm:col-span-3">
                          <div className="flex-1 sm:flex-initial">
                            <label className="block text-xs font-medium text-gray-400 mb-1 sm:hidden">
                              Options
                            </label>
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={variable.isSecret}
                                onChange={(e) => updateVariable(currentGroup.id, variable.id, 'isSecret', e.target.checked)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                              />
                              <span className="ml-1 text-xs text-gray-400">Secret</span>
                            </label>
                          </div>

                          <button
                            onClick={() => removeVariable(currentGroup.id, variable.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>

                        <div className="sm:col-span-12">
                          <input
                            type="text"
                            value={variable.description || ''}
                            onChange={(e) => updateVariable(currentGroup.id, variable.id, 'description', e.target.value)}
                            placeholder="Description (optional)"
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a group to manage its variables
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={loadGroups}
          className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}