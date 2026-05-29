import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionBuilder } from '@/components/session/SessionBuilder'
import type { Drill, DrillCategory } from '@/lib/supabase/types'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const { group: groupParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('club_id')
    .eq('id', user.id)
    .single()

  const [drillsResult, categoriesResult, groupInvitesResult] = await Promise.all([
    supabase.from('drills').select('id, title, description, preview_image_url, canvas_preview_url, category_id, difficulty').eq('is_public', true).order('title'),
    supabase.from('drill_categories').select('*').order('sort_order'),
    profile?.club_id
      ? supabase
          .from('group_invitations')
          .select('group_id, coaching_groups(id, name)')
          .eq('user_id', user.id)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [] }),
  ])

  const drills = (drillsResult.data ?? []) as Drill[]
  const categories = (categoriesResult.data ?? []) as DrillCategory[]

  const groups = (groupInvitesResult.data ?? []).map(inv => {
    const g = Array.isArray(inv.coaching_groups) ? inv.coaching_groups[0] : inv.coaching_groups
    return g as { id: string; name: string } | null
  }).filter((g): g is { id: string; name: string } => g !== null)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="app-heading text-2xl">New Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a training session from the drill library
        </p>
      </div>
      <SessionBuilder
        allDrills={drills}
        categories={categories}
        groups={groups}
        initialGroupId={groupParam}
      />
    </div>
  )
}
