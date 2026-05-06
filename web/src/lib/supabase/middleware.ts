import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect app routes
  const isAppRoute = request.nextUrl.pathname.startsWith('/(app)') ||
    ['/dashboard', '/sessions', '/chat', '/admin', '/game-plans', '/groups', '/clubs', '/settings', '/notifications'].some(p =>
      request.nextUrl.pathname.startsWith(p)
    ) ||
    // Protect drill creation/edit but not the public library and detail pages
    request.nextUrl.pathname === '/drills/new' ||
    /^\/drills\/[^/]+\/edit/.test(request.nextUrl.pathname) ||
    // Protect profile edit but not public profile pages
    /^\/profile\/[^/]+\/edit/.test(request.nextUrl.pathname) ||
    request.nextUrl.pathname === '/profile'

  if (isAppRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
