import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DrillCard } from '@/components/drills/DrillCard'
import { DrillFilters } from '@/components/drills/DrillFilters'
import { DrillGridSkeleton } from '@/components/drills/DrillGridSkeleton'
import { PenTool } from 'lucide-react'
import type { DrillFilters as DrillFiltersType, DrillWithRelations } from '@/lib/supabase/types'

export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<DrillFiltersType>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch user's club if logged in
  let userClubId: string | null = null
  let userClubName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('club_id')
      .eq('id', user.id)
      .single()
    userClubId = profile?.club_id ?? null
    if (userClubId) {
      const { data: club } = await supabase.from('clubs').select('name').eq('id', userClubId).single()
      userClubName = club?.name ?? null
    }
  }

  const [categoriesResult, drillsResult, clubDrillsResult] = await Promise.all([
    supabase.from('drill_categories').select('*').order('sort_order'),
    buildDrillQuery(supabase, filters),
    // Club drills: separate query, only when user is in a club
    userClubId
      ? supabase
          .from('drills')
          .select(`
            id, title, description, difficulty, age_group, player_count,
            preview_image_url, canvas_preview_url, youtube_url, tiktok_url,
            facebook_url, is_public, club_id, created_at, canvas_json,
            category_id, author_id, ai_guide, updated_at,
            category:drill_categories ( id, name, slug ),
            author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url )
          `)
          .eq('club_id', userClubId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  const categories = categoriesResult.data ?? []
  const drills = (drillsResult.data ?? []) as DrillWithRelations[]
  const clubDrills = (clubDrillsResult.data ?? []) as unknown as DrillWithRelations[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Drill Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {drills.length} drill{drills.length !== 1 ? 's' : ''}
            {filters.q || filters.category || filters.difficulty || filters.age_group || filters.min_rating ? ' matching filters' : ''}
          </p>
        </div>
        <Button size="sm" nativeButton={false} render={<Link href="/drills/new" />}>
          <PenTool className="size-4 mr-2" />
          New drill
        </Button>
      </div>

      {/* Club-private drills section */}
      {clubDrills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">🔒 {userClubName} Drills</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {clubDrills.length} private
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {clubDrills.map(drill => (
              <DrillCard key={drill.id} drill={drill} showClubBadge />
            ))}
          </div>
          <div className="border-t border-border pt-2" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Filters sidebar */}
        <aside>
          <Suspense>
            <DrillFilters categories={categories} currentFilters={filters} />
          </Suspense>
        </aside>

        {/* Drill grid */}
        <Suspense fallback={<DrillGridSkeleton />}>
          {drills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🏉</div>
              <p className="font-medium">No drills found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters or{' '}
                <Link href="/drills/new" className="underline">create the first drill</Link>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {drills.map(drill => (
                <DrillCard key={drill.id} drill={drill} />
              ))}
            </div>
          )}
        </Suspense>
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildDrillQuery(supabase: any, filters: DrillFiltersType) {
  let query = supabase
    .from('drills')
    .select(`
      id,
      title,
      description,
      difficulty,
      age_group,
      player_count,
      preview_image_url,
      youtube_url,
      is_public,
      created_at,
      category_id,
      author_id,
      category:drill_categories ( id, name, slug ),
      author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`)
  }
  if (filters.category) {
    // Filter by category slug via subquery
    const { data: cat } = await supabase
      .from('drill_categories')
      .select('id')
      .eq('slug', filters.category)
      .single()
    if (cat) {
      query = query.eq('category_id', cat.id)
    }
  }
  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty)
  }
  if (filters.age_group) {
    query = query.eq('age_group', filters.age_group)
  }
  if (filters.min_rating) {
    const threshold = parseFloat(filters.min_rating)
    if (!isNaN(threshold)) {
      // Use SQL aggregation via RPC instead of fetching all ratings into JS
      const { data: ids } = await supabase.rpc('drill_ids_above_rating', { min_rating: threshold })
      const qualifyingIds = (ids as { drill_ids_above_rating: string }[] | null)?.map(r => r.drill_ids_above_rating) ?? []
      if (qualifyingIds.length === 0) {
        query = query.in('id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        query = query.in('id', qualifyingIds)
      }
    }
  }

  return query
}
