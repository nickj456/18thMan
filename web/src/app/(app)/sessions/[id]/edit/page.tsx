import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionBuilder } from '@/components/session/SessionBuilder'
import type { SessionPlan, SessionDrillItem, Drill, DrillCategory } from '@/lib/supabase/types'

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: session } = await supabase
    .from('session_plans')
    .select('*')
    .eq('id', id)
    .eq('coach_id', user.id)
    .single()

  if (!session) notFound()

  const sessionPlan = session as SessionPlan

  // Fetch drills in session and all public drills
  const drillIds = (sessionPlan.drills_order as SessionDrillItem[]).map(d => d.drill_id)

  const [sessionDrillsResult, allDrillsResult, categoriesResult] = await Promise.all([
    drillIds.length > 0
      ? supabase.from('drills').select('id, title, description, preview_image_url, canvas_preview_url, difficulty, youtube_url, category_id, author_id, is_public, tiktok_url, facebook_url, ai_guide, canvas_json, age_group, player_count, created_at, updated_at').in('id', drillIds)
      : Promise.resolve({ data: [] }),
    supabase.from('drills').select('id, title, description, preview_image_url, canvas_preview_url, difficulty, youtube_url, category_id, author_id, is_public, tiktok_url, facebook_url, ai_guide, canvas_json, age_group, player_count, created_at, updated_at').eq('is_public', true).order('title'),
    supabase.from('drill_categories').select('*').order('sort_order'),
  ])

  const resolvedDrills = (sessionDrillsResult.data ?? []) as Drill[]
  const allDrills = (allDrillsResult.data ?? []) as Drill[]
  const categories = (categoriesResult.data ?? []) as DrillCategory[]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Edit Session</h1>
        <p className="text-sm text-muted-foreground mt-1">{sessionPlan.title}</p>
      </div>
      <SessionBuilder
        allDrills={allDrills}
        categories={categories}
        initialSession={{ ...sessionPlan, resolvedDrills }}
      />
    </div>
  )
}
