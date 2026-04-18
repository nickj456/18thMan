import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Game Plans — 18th Man' }

export default async function GamePlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: gamePlans } = await supabase
    .from('game_plans')
    .select('id, opposition, pitch, kick_off_time, status, created_at, home_logo_url, away_logo_url')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <ClipboardList size={18} className="text-[#e8560a]" />
          </div>
          <div>
            <h1 className="app-heading text-2xl">Game Plans</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Match preparation documents</p>
          </div>
        </div>
        <Link
          href="/game-plans/new"
          className="bg-[#e8560a] hover:bg-[#c94d08] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          New Game Plan
        </Link>
      </div>

      {/* Content */}
      {!gamePlans?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <ClipboardList size={32} className="text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500 mb-4">No game plans yet. Create your first game plan.</p>
          <Link
            href="/game-plans/new"
            className="bg-[#e8560a] hover:bg-[#c94d08] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            New Game Plan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {gamePlans.map(plan => (
            <Link
              key={plan.id}
              href={`/game-plans/${plan.id}`}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:bg-zinc-800/60 transition-all block"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="font-semibold text-white truncate">{plan.opposition}</p>
                {plan.status === 'generated' ? (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-medium">
                    Generated
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-600/20 text-zinc-400 font-medium">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                {[plan.pitch, plan.kick_off_time].filter(Boolean).join(' · ') || 'No details set'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
