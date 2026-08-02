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

  if (typeof path !== 'string' || path.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse(null, { status: 204 })
  }

  // Best-effort tracking: never surface an insert failure to the beacon caller.
  await supabase.from('page_views').insert({ path, user_id: user.id })

  return new NextResponse(null, { status: 204 })
}
