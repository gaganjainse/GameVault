import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require an authenticated session.
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/terms', '/privacy']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/game/')) return true
  return false
}

// Routes that require an admin/moderator role, on top of being authenticated.
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin')
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated users get redirected server-side before any protected
  // page HTML/JS ships — previously this only happened client-side after
  // hydration (components/layout/route-guard.tsx), which still runs as a
  // client-side backstop but should no longer be the only line of defense.
  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAdminRoute(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/feed', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, icon.svg
     * - files with an extension (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.[\\w]+$).*)',
  ],
}
