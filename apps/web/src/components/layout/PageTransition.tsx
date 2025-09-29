'use client'

import { usePathname } from 'next/navigation'
import { useEffect, ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  useEffect(() => {
    // Force re-trigger animation on route change by adding/removing class
    const mainContent = document.getElementById('page-content')
    if (mainContent) {
      mainContent.classList.remove('page-transition')
      // Force reflow to restart animation
      void mainContent.offsetWidth
      mainContent.classList.add('page-transition')
    }
  }, [pathname])

  return (
    <div id="page-content" className="page-transition">
      {children}
    </div>
  )
}