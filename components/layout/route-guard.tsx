'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/auth-context'
import { Gamepad2 } from 'lucide-react'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/terms', '/privacy']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/game/')) return true
  return false
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const pathname = window.location.pathname

    if (!loading && !user && !isPublicRoute(pathname)) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Loading GameVault...</p>
        </div>
      </div>
    )
  }

  if (typeof window !== 'undefined' && !user && !isPublicRoute(window.location.pathname)) {
    return null
  }

  return <>{children}</>
}
