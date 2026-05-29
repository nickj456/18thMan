import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PodcastCard } from '@/components/podcasts/PodcastCard'
import { PodcastFilters } from '@/components/podcasts/PodcastFilters'
import { createClient } from '@/lib/supabase/server'
import { Plus } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Podcast Library',
  description: 'Rugby league coaching podcasts — curated and searchable by topic, tactic, and age group.',
}

interface SearchParams {
  q?: string
  tags?: string
  sort?: string
  saved?: string
}

export default async function PodcastsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const canUpload = profile?.role === 'coach' || profile?.role === 'admin'

  // Fetch top tags for filter panel (always needed)
  const { data: tagRows } = await supabase.from('podcast_tags').select('tag')
  const tagCounts = (tagRows ?? []).reduce<Record<string, number>>((acc, { tag }) => {
    acc[tag] = (acc[tag] ?? 0) + 1
    return acc
  }, {})
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag]) => tag)

  // If filtering by saved, fetch the user's saved podcast IDs first
  let savedIds: string[] | null = null
  if (filters.saved === '1' && user) {
    const { data: saves } = await supabase
      .from('podcast_saves')
      .select('podcast_id')
      .eq('user_id', user.id)
    savedIds = (saves ?? []).map(s => s.podcast_id)
    // User has no saves — short-circuit before running the main query
    if (savedIds.length === 0) {
      return <PageShell filters={filters} topTags={topTags} canUpload={canUpload} showSaved={!!user} podcasts={[]} />
    }
  }

  // Build podcast query
  let query = supabase
    .from('podcasts')
    .select(`
      id, title, description, ai_summary, cover_image_url, external_url, duration_text, play_count, created_at,
      uploader:profiles!podcasts_uploaded_by_fkey ( username, display_name, avatar_url ),
      tags:podcast_tags ( tag, source ),
      reactions:podcast_reactions ( reaction )
    `)

  if (filters.q) {
    query = query.textSearch('search_vector', filters.q, { type: 'websearch', config: 'english' })
  }

  if (savedIds !== null) {
    query = query.in('id', savedIds)
  }

  if (filters.tags) {
    const tagList = filters.tags.split(',').filter(Boolean)
    if (tagList.length > 0) {
      const matchingIds = await supabase
        .from('podcast_tags')
        .select('podcast_id')
        .in('tag', tagList)
        .then(r => [...new Set((r.data ?? []).map(t => t.podcast_id))])
      query = query.in('id', matchingIds)
    }
  }

  query = query.order('created_at', { ascending: false })

  const { data: podcastsRaw } = await query

  // Shape the raw Supabase response
  type RawPodcast = typeof podcastsRaw extends (infer T)[] | null ? T : never
  function shapePodcast(p: RawPodcast) {
    if (!p) return null
    const r = p as Record<string, unknown>
    const reactions = (r.reactions as { reaction: string }[] | null) ?? []
    return {
      id: r.id as string,
      title: r.title as string,
      description: r.description as string | null,
      ai_summary: r.ai_summary as string | null,
      cover_image_url: r.cover_image_url as string | null,
      external_url: r.external_url as string,
      duration_text: r.duration_text as string | null,
      play_count: (r.play_count as number) ?? 0,
      created_at: r.created_at as string,
      uploader: r.uploader as { username: string | null; display_name: string | null; avatar_url: string | null } | null,
      tags: (r.tags as { tag: string; source: string }[] | null) ?? [],
      reaction_counts: {
        like: reactions.filter(rx => rx.reaction === 'like').length,
        love: reactions.filter(rx => rx.reaction === 'love').length,
      },
    }
  }

  let podcasts = (podcastsRaw ?? []).map(shapePodcast).filter(Boolean) as NonNullable<ReturnType<typeof shapePodcast>>[]

  // Sort by popularity post-fetch if requested
  if (filters.sort === 'popular') {
    podcasts = podcasts.sort((a, b) =>
      (b.reaction_counts.like + b.reaction_counts.love) - (a.reaction_counts.like + a.reaction_counts.love)
    )
  }

  return <PageShell filters={filters} topTags={topTags} canUpload={canUpload} showSaved={!!user} podcasts={podcasts} />
}

type PodcastItem = {
  id: string
  title: string
  description: string | null
  ai_summary: string | null
  cover_image_url: string | null
  external_url: string
  duration_text: string | null
  play_count: number
  created_at: string
  uploader: { username: string | null; display_name: string | null; avatar_url: string | null } | null
  tags: { tag: string; source: string }[]
  reaction_counts: { like: number; love: number }
}

function PageShell({
  filters,
  topTags,
  canUpload,
  showSaved,
  podcasts,
}: {
  filters: SearchParams
  topTags: string[]
  canUpload: boolean
  showSaved: boolean
  podcasts: PodcastItem[]
}) {
  const hasFilters = !!(filters.q || filters.tags || filters.saved)
  const emptyMessage = filters.saved === '1'
    ? "You haven't saved any podcasts yet. Tap the bookmark on any podcast to save it."
    : hasFilters
    ? 'No podcasts match your filters.'
    : 'No podcasts yet. Be the first to add one!'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Podcast Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''}
            {hasFilters ? ' matching filters' : ''}
          </p>
        </div>
        {canUpload && (
          <Button render={<Link href="/podcasts/new" />} size="sm">
            <Plus className="size-4 mr-1" />
            Add Podcast
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-6">
          <Suspense>
            <PodcastFilters topTags={topTags} currentFilters={filters} showSaved={showSaved} />
          </Suspense>
        </aside>

        <div>
          {podcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="text-4xl">🎙️</div>
              <p className="text-muted-foreground">{emptyMessage}</p>
              {canUpload && filters.saved !== '1' && (
                <Button render={<Link href="/podcasts/new" />} variant="outline" size="sm">
                  Add a podcast
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {podcasts.map(p => (
                <PodcastCard key={p.id} podcast={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
