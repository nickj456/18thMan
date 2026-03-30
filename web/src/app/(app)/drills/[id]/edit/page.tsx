import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DrillDesigner } from '@/components/designer/DrillDesigner'
import type { DrillCategory } from '@/lib/supabase/types'
import type { CanvasState } from '@/components/designer/types'

export default async function EditDrillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [drillResult, categoriesResult, profileResult] = await Promise.all([
    supabase
      .from('drills')
      .select('id, title, description, category_id, difficulty, age_group, player_count, canvas_json, youtube_url, tiktok_url, facebook_url, preview_image_url, canvas_preview_url, author_id')
      .eq('id', id)
      .single(),
    supabase.from('drill_categories').select('*').order('sort_order'),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (!drillResult.data) notFound()

  const drill = drillResult.data
  const userRole = profileResult.data?.role ?? 'viewer'
  const canEdit = drill.author_id === user.id || userRole === 'admin'
  if (!canEdit) redirect(`/drills/${id}`)

  const categories = (categoriesResult.data ?? []) as DrillCategory[]

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <h1 className="text-sm font-semibold">Editing: {drill.title}</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <DrillDesigner
          categories={categories}
          initialDrill={{
            id: drill.id,
            title: drill.title,
            description: drill.description,
            category_id: drill.category_id,
            difficulty: drill.difficulty,
            age_group: drill.age_group,
            player_count: drill.player_count,
            canvas_json: drill.canvas_json as CanvasState | null,
            youtube_url: drill.youtube_url,
            tiktok_url: drill.tiktok_url,
            facebook_url: drill.facebook_url,
            preview_image_url: drill.preview_image_url,
            canvas_preview_url: drill.canvas_preview_url,
          }}
        />
      </div>
    </div>
  )
}
