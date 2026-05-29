import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GamePlanForm } from '@/components/game-plans/GamePlanForm'
import { GamePlanView } from '@/components/game-plans/GamePlanView'
import { DeleteGamePlanButton } from '@/components/game-plans/DeleteGamePlanButton'

export const metadata = { title: 'Game Plan — 18th Man' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function GamePlanDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, display_name, club').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: gamePlan } = await supabase
    .from('game_plans')
    .select('*')
    .eq('id', id)
    .single()

  if (!gamePlan) redirect('/game-plans')

  const teamName = profile?.display_name ?? profile?.club ?? 'Your Team'

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl">
      {/* Left: form */}
      <div>
        <h2 className="app-heading text-xl mb-4">Edit Game Plan</h2>
        <GamePlanForm gamePlan={gamePlan} />
        <DeleteGamePlanButton id={gamePlan.id} />
      </div>

      {/* Right: AI output */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="app-heading text-xl">Generated Plan</h2>
          {gamePlan.status === 'generated' && (
            <Link
              href={`/api/game-plans/${gamePlan.id}/pdf`}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors"
            >
              <FileDown size={14} />
              Export PDF
            </Link>
          )}
        </div>
        <GamePlanView gamePlan={gamePlan} teamName={teamName} />
      </div>
    </div>
  )
}
