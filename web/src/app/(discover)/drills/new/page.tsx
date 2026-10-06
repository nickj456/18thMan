import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DrillDesigner } from '@/components/designer/DrillDesigner'
import { hasClubAccess, getEffectiveTierCached } from '@/lib/subscription'

export const metadata = { title: 'New Drill — 18th Man' }

export default async function NewDrillPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [categoriesResult, profileResult] = await Promise.all([
    supabase.from('drill_categories').select('*').order('sort_order'),
    supabase.from('profiles').select('club_id').eq('id', user.id).single(),
  ])

  const clubId = profileResult.data?.club_id ?? null
  let clubName: string | null = null
  if (clubId) {
    const { data: club } = await supabase.from('clubs').select('name').eq('id', clubId).single()
    clubName = club?.name ?? null
  }
  const tier = await getEffectiveTierCached(user.id)

  return (
    <div className="-m-6 flex h-[calc(100dvh-3rem)] flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
        <Link
          href="/drills"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Drills
        </Link>
        <span aria-hidden className="text-muted-foreground/50">/</span>
        <h1 className="app-heading text-base leading-none">New Drill</h1>
      </header>
      <DrillDesigner
        categories={categoriesResult.data ?? []}
        userClubId={clubId}
        userClubName={clubName}
        hasClubAccess={hasClubAccess(tier)}
      />
    </div>
  )
}
