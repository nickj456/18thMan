import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let path: unknown

  try {
    const body = await request.json()
    path = body.path
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Must look like a real in-app path, and be bounded — this endpoint is
  // reachable by any authenticated user, so an unvalidated `path` would let
  // one flood page_views with junk and pollute the admin Top Pages list.
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > 512) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse(null, { status: 204 })
  }

  // Best-effort tracking: never surface an insert failure to the beacon caller,
  // but do log it server-side — otherwise an unapplied migration or a broken
  // RLS policy silently records nothing forever.
  const { error } = await supabase.from('page_views').insert({ path, user_id: user.id })
  if (error) {
    console.error('[track-page-view]', error.message)
  }

  return new NextResponse(null, { status: 204 })
}
