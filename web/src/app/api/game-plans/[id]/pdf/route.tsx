import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { GamePlanPDF } from '@/components/game-plans/GamePlanPDF'
import type { GamePlan, GamePlanAiPlan } from '@/lib/supabase/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club, display_name')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response('Forbidden', { status: 403 })
    }

    const teamName = profile.club || profile.display_name || 'Your Team'

    const { data: gamePlan } = await supabase
      .from('game_plans')
      .select('*')
      .eq('id', id)
      .single()

    if (!gamePlan) return new Response('Not Found', { status: 404 })

    const plan = gamePlan as GamePlan

    if (!plan.ai_plan || plan.status !== 'generated') {
      return new Response('Game plan not yet generated', { status: 400 })
    }

    const aiPlan = plan.ai_plan as GamePlanAiPlan

    const buffer = await renderToBuffer(
      <GamePlanPDF gamePlan={{ ...plan, ai_plan: aiPlan }} teamName={teamName} />
    )

    const slug = plan.opposition
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}-game-plan.pdf"`,
      },
    })
  } catch (err) {
    console.error('[game-plans/pdf/route] Failed to generate game plan PDF:', err)
    return new Response('Internal Server Error', { status: 500 })
  }
}
