'use client'

import { usePathname } from 'next/navigation'
import { DashboardLayout } from './DashboardLayout'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Check if we're on a dashboard route
  const isDashboardRoute = pathname?.startsWith('/dashboard') || 
                          pathname?.startsWith('/analytics') ||
                          pathname?.startsWith('/projects') ||
                          pathname?.startsWith('/team') ||
                          pathname?.startsWith('/settings') ||
                          pathname?.startsWith('/chat')

  if (isDashboardRoute) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  // Default layout for non-dashboard pages
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="hidden font-bold sm:inline-block">
                Agentic Template
              </span>
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-background">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built with Next.js, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}