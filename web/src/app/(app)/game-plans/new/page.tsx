import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GamePlanForm } from '@/components/game-plans/GamePlanForm'

export const metadata = { title: 'New Game Plan — 18th Man' }

export default async function NewGamePlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="app-heading text-2xl">New Game Plan</h1>
        <p className="text-sm text-zinc-500 mt-1">Create a game plan for your next match</p>
      </div>
      <GamePlanForm />
    </div>
  )
}
