import Link from 'next/link'

const settingsCategories = [
  {
    title: 'Environment Variables',
    description: 'Manage all your application environment variables and credentials in organized groups',
    href: '/settings/environment',
    icon: '🔧'
  },
  {
    title: 'API Keys',
    description: 'Quick setup for AI provider API keys with validation',
    href: '/settings/api-keys',
    icon: '🔑'
  }
]

export default function SettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 mt-2">
          Configure your application settings, credentials, and integrations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsCategories.map((category) => (
          <Link
            key={category.title}
            href={category.href}
            className="block p-6 bg-gray-900 rounded-lg border border-gray-800 hover:border-indigo-600 hover:bg-gray-800 transition-all"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{category.icon}</span>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-100 mb-2">
                  {category.title}
                </h2>
                <p className="text-gray-400 text-sm">
                  {category.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}