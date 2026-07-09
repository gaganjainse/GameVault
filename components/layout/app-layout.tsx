'use client'

import { Header } from './header'
import { Sidebar } from './sidebar'
import { RouteGuard } from './route-guard'

interface AppLayoutProps {
  children: React.ReactNode
  showSidebar?: boolean
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <RouteGuard>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1">
          {showSidebar && <Sidebar />}
          <main className="flex-1">
            <div className="container mx-auto py-6 px-4 lg:px-8 pb-20 lg:pb-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </RouteGuard>
  )
}
