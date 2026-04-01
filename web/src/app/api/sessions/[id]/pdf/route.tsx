import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { SessionPlanPDF } from '@/components/session/SessionPlanPDF'
import type { SessionPlan, SessionDrillItem, AiGuide } from '@/lib/supabase/types'
import type { SessionSummary } from '@/app/(app)/sessions/actions'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: session } = await supabase
      .from('session_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (!session) return new Response('Not Found', { status: 404 })

    if (session.coach_id !== user.id && !session.is_shared) {
      return new Response('Forbidden', { status: 403 })
    }

    const drillItems = (session.drills_order ?? []) as SessionDrillItem[]
    const drillIds = drillItems.map(d => d.drill_id)

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
      const { data: drills } = await supabase
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

    const profileResult = await supabase
      .from('profiles')
      .select('display_name, club')
      .eq('id', session.coach_id)
      .single()

    const coach = profileResult.data ?? { display_name: null, club: null }

    const enrichedItems = drillItems
      .map(item => ({ ...item, drill: drillsMap.get(item.drill_id) }))
      .filter((item): item is typeof item & { drill: NonNullable<typeof item.drill> } =>
        item.drill !== undefined
      )

    const sessionWithSummary = session as SessionPlan & { ai_summary?: SessionSummary }

    const buffer = await renderToBuffer(
      <SessionPlanPDF
        session={sessionWithSummary}
        drillItems={enrichedItems}
        coach={coach}
      />
    )

    const slug = session.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}-session-plan.pdf"`,
      },
    })
  } catch (err) {
    console.error('[pdf/route] Failed to generate session PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
