'use client'

import { Suspense } from 'react'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={null}>
      <LayoutWrapper>{children}</LayoutWrapper>
    </Suspense>
  )
}