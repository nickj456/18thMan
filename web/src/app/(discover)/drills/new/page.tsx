import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DrillDesigner } from '@/components/designer/DrillDesigner'

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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <a href="/drills" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Drills
        </a>
        <span className="text-zinc-700">/</span>
        <h1 className="text-sm font-semibold text-white">New Drill</h1>
      </header>
      <DrillDesigner
        categories={categoriesResult.data ?? []}
        userClubId={clubId}
        userClubName={clubName}
      />
    </div>
  )
}
