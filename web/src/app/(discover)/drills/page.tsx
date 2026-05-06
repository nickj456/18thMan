import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { DrillCard } from '@/components/drills/DrillCard'
import { CollapsiblePrivateDrills } from '@/components/drills/CollapsiblePrivateDrills'
import { DrillFilters } from '@/components/drills/DrillFilters'
import { DrillGridSkeleton } from '@/components/drills/DrillGridSkeleton'
import { PenTool } from 'lucide-react'
import type { DrillFilters as DrillFiltersType, DrillWithRelations } from '@/lib/supabase/types'

export const metadata: Metadata = {
  title: 'Rugby League Drill Library — 18th Man',
  description: 'Browse hundreds of free rugby league drills — passing, defence, attack, fitness, and more. Design your own with our visual drill designer.',
  openGraph: {
    title: 'Rugby League Drill Library — 18th Man',
    description: 'Browse hundreds of free rugby league drills — passing, defence, attack, fitness, and more.',
  },
}

export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<DrillFiltersType>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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
    userClubId
      ? supabase
          .from('drills')
          .select(`
            id, title, description, difficulty, age_group, player_count,
            preview_image_url, canvas_preview_url, youtube_url, tiktok_url,
            facebook_url, is_public, club_id, created_at, canvas_json,
            category_id, author_id, ai_guide, updated_at, approval_status,
            category:drill_categories ( id, name, slug ),
            author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url )
          `)
          .eq('club_id', userClubId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  const categories = categoriesResult.data ?? []
  const drills = (drillsResult.data ?? []) as unknown as DrillWithRelations[]
  const clubDrills = (clubDrillsResult.data ?? []) as unknown as DrillWithRelations[]

  return (
    <div className="space-y-6">
      {/* Sign-up banner for logged-out users */}
      {!user && (
        <div className="rounded-xl border border-[#e8560a]/30 bg-[#e8560a]/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-white">Design your own drills and plan sessions</p>
            <p className="text-xs text-zinc-400 mt-0.5">Free account — no credit card required.</p>
          </div>
          <Link
            href="/signup"
            className="shrink-0 text-xs font-semibold bg-[#e8560a] hover:bg-[#d14d09] text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign up free
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="app-heading text-2xl">Drill Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {drills.length} drill{drills.length !== 1 ? 's' : ''}
            {filters.q || filters.category || filters.difficulty || filters.age_group || filters.min_rating ? ' matching filters' : ''}
          </p>
        </div>
        {user && (
          <Button size="sm" nativeButton={false} render={<Link href="/drills/new" />}>
            <PenTool className="size-4 mr-2" />
            New drill
          </Button>
        )}
      </div>

      {clubDrills.length > 0 && userClubName && (
        <CollapsiblePrivateDrills drills={clubDrills} clubName={userClubName} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside>
          <Suspense>
            <DrillFilters categories={categories} currentFilters={filters} />
          </Suspense>
        </aside>

        <Suspense fallback={<DrillGridSkeleton />}>
          {drills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">🏉</div>
              <p className="font-medium">No drills found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your filters
                {user && (
                  <> or{' '}
                    <Link href="/drills/new" className="underline">create the first drill</Link>
                  </>
                )}
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

async function buildDrillQuery(supabase: Awaited<ReturnType<typeof createClient>>, filters: DrillFiltersType) {
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
      approval_status,
      category:drill_categories ( id, name, slug ),
      author:profiles!drills_author_id_fkey ( id, username, display_name, avatar_url )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (filters.q) {
    const safeQ = filters.q.replace(/[^a-zA-Z0-9 '\-]/g, '')
    if (safeQ) query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`)
  }
  if (filters.category) {
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
