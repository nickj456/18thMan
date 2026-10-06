import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isSafeRedirectPath } from '@/lib/redirect-safety'

const COACH_DNA_PREFIX = '/coach-dna'

// Coach DNA moved out of /admin — emails already sent still link to the old path.
const LEGACY_COACH_DNA_PREFIX = '/admin/coach-dna'

const PROTECTED_PREFIXES = ['/dashboard', '/sessions', '/chat', '/admin', '/game-plans', '/groups', '/clubs', '/settings', '/notifications']

// Coach DNA is a free-tier hook, so signed-out visitors land on signup rather
// than login (signup links through to login, carrying `next`, for existing users).
// These are protected too — no need to repeat them in PROTECTED_PREFIXES.
const SIGNUP_FIRST_PREFIXES = [COACH_DNA_PREFIX]

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (matchesPrefix(pathname, LEGACY_COACH_DNA_PREFIX)) {
    const url = request.nextUrl.clone()
    url.pathname = COACH_DNA_PREFIX + pathname.slice(LEGACY_COACH_DNA_PREFIX.length)
    return NextResponse.redirect(url, 307)
  }

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
    PROTECTED_PREFIXES.some(p => request.nextUrl.pathname.startsWith(p)) ||
    SIGNUP_FIRST_PREFIXES.some(p => matchesPrefix(request.nextUrl.pathname, p)) ||
    // Protect drill creation/edit but not the public library and detail pages
    request.nextUrl.pathname === '/drills/new' ||
    /^\/drills\/[^/]+\/edit/.test(request.nextUrl.pathname) ||
    // Protect profile edit but not public profile pages
    /^\/profile\/[^/]+\/edit/.test(request.nextUrl.pathname) ||
    request.nextUrl.pathname === '/profile'

  if (isAppRoute && !user) {
    const next = request.nextUrl.pathname + request.nextUrl.search
    const url = request.nextUrl.clone()
    url.pathname = SIGNUP_FIRST_PREFIXES.some(p => matchesPrefix(pathname, p)) ? '/signup' : '/login'
    url.search = `?next=${encodeURIComponent(next)}`
    return NextResponse.redirect(url)
  }

  // Emails link returning coaches to /login?next=… — skip the form when their
  // session is still live. Carry the refreshed auth cookies onto the redirect.
  const loginNext = request.nextUrl.searchParams.get('next')
  if (user && pathname === '/login' && isSafeRedirectPath(loginNext)) {
    const res = NextResponse.redirect(new URL(loginNext, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => res.cookies.set(cookie))
    return res
  }

  return supabaseResponse
}
