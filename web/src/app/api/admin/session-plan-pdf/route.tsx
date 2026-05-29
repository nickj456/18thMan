import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { SessionPlanPDF } from '@/components/session/SessionPlanPDF'
import type { SessionPlan, SessionDrillItem, AiGuide } from '@/lib/supabase/types'
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileError) return NextResponse.json({ error: 'Server error' }, { status: 500 })
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body?.sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

  const service = createServiceClient()

  const { data: session } = await service
    .from('session_plans')
    .select('*')
    .eq('id', body.sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session plan not found' }, { status: 404 })

  const sessionItems = (session.drills_order ?? []) as SessionDrillItem[]
  const drillIds = sessionItems.filter((d: SessionDrillItem) => d.drill_id).map((d: SessionDrillItem) => d.drill_id!)

  const drillsMap = new Map<string, {
    id: string
    title: string
    description: string | null
    difficulty: string | null
    age_group: string | null
    player_count: string | null
    canvas_preview_url: string | null
    ai_guide: AiGuide | null
  }>()

  if (drillIds.length > 0) {
    const { data: drills } = await service
      .from('drills')
      .select('id, title, description, difficulty, age_group, player_count, canvas_preview_url, ai_guide')
      .in('id', drillIds)
    for (const drill of drills ?? []) {
      drillsMap.set(drill.id, {
        ...drill,
        ai_guide: (drill.ai_guide as AiGuide | null) ?? null,
      })
    }
  }

  const { data: coachProfile } = await service
    .from('profiles')
    .select('display_name, club')
    .eq('id', session.coach_id)
    .single()

  const coach = coachProfile ?? { display_name: null, club: null }

  // Build enriched drill items matching what SessionPlanPDF expects
  const drillItems = sessionItems.map((item: SessionDrillItem) => {
    if (item.drill_id) {
      const drill = drillsMap.get(item.drill_id)
      if (!drill) return null
      return { ...item, drill }
    }
    // Custom block — no drill lookup
    return { ...item, drill: undefined }
  }).filter((item): item is NonNullable<typeof item> => item !== null)

  const sessionWithSummary = session as SessionPlan & { ai_summary?: undefined }

  const buffer = await renderToBuffer(
    <SessionPlanPDF
      session={sessionWithSummary}
      drillItems={drillItems}
      coach={coach}
    />
  )

  const safeTitle = (session.title ?? 'session-plan')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)
  const filename = `${safeTitle}.pdf`
  const path = `pdfs/session-${session.id}-${Date.now()}.pdf`

  const { error: uploadError } = await service.storage
    .from('email-assets')
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: urlData } = service.storage.from('email-assets').getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl, filename })
}
