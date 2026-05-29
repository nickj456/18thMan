import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Sparkles, LayoutList } from 'lucide-react'
import { CreateBlockForm } from './CreateBlockForm'

export const metadata = { title: 'New Coaching Block — 18th Man' }

export default async function NewBlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile?.club_id) redirect('/clubs')

  const { data: group } = await supabase
    .from('coaching_groups')
    .select('id, name, club_id')
    .eq('id', id)
    .single()

  if (!group || group.club_id !== profile.club_id) redirect('/groups')

  const { data: membership } = await supabase
    .from('group_invitations')
    .select('group_role')
    .eq('group_id', id)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .maybeSingle()
  const isGroupAdmin = (membership as { group_role?: string | null } | null)?.group_role === 'admin'

  if (profile.club_role !== 'admin' && profile.role !== 'admin' && !isGroupAdmin) redirect(`/groups/${id}`)

  return (
    <div className="max-w-lg space-y-8">
      <Link href={`/groups/${id}`} className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> {group.name}
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e8560a]/10 border border-[#e8560a]/20 flex items-center justify-center shrink-0">
          <LayoutList size={18} className="text-[#e8560a]" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">New Coaching Block</h1>
          <p className="text-sm text-zinc-500 mt-0.5">AI plans every session upfront — you prepare each one as it approaches</p>
        </div>
      </div>

      {/* What is a coaching block */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-2 text-sm text-zinc-400">
        <p className="font-medium text-zinc-300 flex items-center gap-1.5"><Sparkles size={13} className="text-[#e8560a]" /> How it works</p>
        <ul className="space-y-1.5 text-xs text-zinc-500 list-none">
          <li className="flex items-start gap-2"><span className="text-[#e8560a] font-bold mt-0.5">1.</span>Name your block and choose the number of sessions</li>
          <li className="flex items-start gap-2"><span className="text-[#e8560a] font-bold mt-0.5">2.</span>AI instantly plans every session — balanced across Attack, Defence, Completions & Skills</li>
          <li className="flex items-start gap-2"><span className="text-[#e8560a] font-bold mt-0.5">3.</span>~1 week before each session, open it, add your drills and set the date</li>
          <li className="flex items-start gap-2"><span className="text-[#e8560a] font-bold mt-0.5">4.</span>If the team struggles on a Saturday, swap sessions — coverage is preserved, just reordered</li>
        </ul>
      </div>

      <CreateBlockForm groupId={id} />
    </div>
  )
}
