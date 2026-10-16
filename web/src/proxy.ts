import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // play-designer/ is a public static page; its fonts and logo don't need a session check.
    '/((?!_next/static|_next/image|favicon.ico|play-designer/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
