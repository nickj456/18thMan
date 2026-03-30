import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlaylistImporter } from './PlaylistImporter'
import type { DrillCategory } from '@/lib/supabase/types'

export default async function ImportPlaylistPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/drills')

  const { data: categories } = await supabase
    .from('drill_categories')
    .select('*')
    .order('sort_order')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import YouTube Playlist</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bulk import videos from a YouTube playlist as drills. AI guides can be generated per video.
        </p>
      </div>
      <PlaylistImporter categories={(categories ?? []) as DrillCategory[]} />
    </div>
  )
}
