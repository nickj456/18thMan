import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SessionBuilder } from '@/components/session/SessionBuilder'
import type { Drill, DrillCategory } from '@/lib/supabase/types'

export default async function NewSessionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [drillsResult, categoriesResult] = await Promise.all([
    supabase.from('drills').select('id, title, description, preview_image_url, canvas_preview_url, category_id, difficulty').eq('is_public', true).order('title'),
    supabase.from('drill_categories').select('*').order('sort_order'),
  ])

  const drills = (drillsResult.data ?? []) as Drill[]
  const categories = (categoriesResult.data ?? []) as DrillCategory[]

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="app-heading text-2xl">New Session</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build a training session from the drill library
        </p>
      </div>
      <SessionBuilder allDrills={drills} categories={categories} />
    </div>
  )
}
