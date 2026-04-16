import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SessionPlan, SessionDrillItem, Drill, AiGuide } from '@/lib/supabase/types'
import type { SessionSummary } from '../../actions'
import { DeliveryMode } from '@/components/session/DeliveryMode'

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('session_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const sessionPlan = session as SessionPlan & { ai_summary?: SessionSummary }
  const isOwner = sessionPlan.coach_id === user.id

  // For group sessions, check membership
  if (!isOwner && sessionPlan.group_id) {
    const { data: member } = await supabase
      .from('group_invitations')
      .select('id')
      .eq('group_id', sessionPlan.group_id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .single()
    if (!member) notFound()
  } else if (!isOwner) {
    notFound()
  }

  const allItems = (sessionPlan.drills_order ?? []) as SessionDrillItem[]
  if (allItems.length === 0) redirect(`/sessions/${id}`)

  const drillIds = allItems.filter(d => d.drill_id).map(d => d.drill_id!)
  const drillsMap = new Map<string, Drill>()

  if (drillIds.length > 0) {
    const { data: drills } = await supabase
      .from('drills')
      .select('id, title, description, preview_image_url, canvas_preview_url, difficulty, player_count, age_group, ai_guide')
      .in('id', drillIds)
    for (const drill of drills ?? []) drillsMap.set(drill.id, drill as Drill)
  }

  // Build serialisable delivery items
  const deliveryItems = allItems.map((item) => {
    if (item.drill_id) {
      const drill = drillsMap.get(item.drill_id)
      const guide = drill?.ai_guide as AiGuide | null
      return {
        type: 'drill' as const,
        title: drill?.title ?? 'Drill',
        description: drill?.description ?? null,
        imageUrl: drill?.canvas_preview_url ?? drill?.preview_image_url ?? null,
        difficulty: drill?.difficulty ?? null,
        playerCount: (drill as any)?.player_count ?? null,
        ageGroup: (drill as any)?.age_group ?? null,
        coachingPoints: guide?.coaching_points ?? [],
        durationMinutes: item.duration_minutes,
        notes: item.notes ?? null,
      }
    }
    return {
      type: 'custom' as const,
      title: item.custom_title ?? 'Block',
      customType: item.custom_type ?? null,
      description: null,
      imageUrl: null,
      difficulty: null,
      playerCount: null,
      ageGroup: null,
      coachingPoints: [],
      durationMinutes: item.duration_minutes,
      notes: item.notes ?? null,
    }
  })

  return (
    <DeliveryMode
      sessionTitle={sessionPlan.title}
      sessionId={id}
      items={deliveryItems}
      aiSummary={sessionPlan.ai_summary ?? null}
    />
  )
}
