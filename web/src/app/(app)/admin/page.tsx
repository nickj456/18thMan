import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Users, PenTool, CalendarDays, MessageSquare, ListVideo, Tag, ShieldCheck, ArrowRight, TrendingUp, Building2 } from 'lucide-react'

export const metadata = { title: 'Admin — 18th Man' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [
    usersRes,
    drillsRes,
    sessionsRes,
    threadsRes,
    categoriesRes,
    coachesRes,
    viewersRes,
    clubsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('drills').select('id', { count: 'exact', head: true }),
    supabase.from('session_plans').select('id', { count: 'exact', head: true }),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('type', 'community'),
    supabase.from('drill_categories').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coach'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'viewer'),
    supabase.from('clubs').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Users', value: usersRes.count ?? 0, icon: Users, accent: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'Drills Created', value: drillsRes.count ?? 0, icon: PenTool, accent: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Session Plans', value: sessionsRes.count ?? 0, icon: CalendarDays, accent: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Community Threads', value: threadsRes.count ?? 0, icon: MessageSquare, accent: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  ]

  const panels = [
    {
      href: '/admin/users',
      icon: Users,
      label: 'User Management',
      description: `${coachesRes.count ?? 0} coaches · ${viewersRes.count ?? 0} viewers`,
      colour: 'border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400',
    },
    {
      href: '/admin/categories',
      icon: Tag,
      label: 'Drill Categories',
      description: `${categoriesRes.count ?? 0} categories configured`,
      colour: 'border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400',
    },
    {
      href: '/admin/clubs',
      icon: Building2,
      label: 'Clubs',
      description: `${clubsRes.count ?? 0} clubs configured`,
      colour: 'border-amber-500/20 hover:border-amber-500/40 text-amber-400',
    },
    {
      href: '/admin/import-playlist',
      icon: ListVideo,
      label: 'Import Playlist',
      description: 'Bulk import drills from YouTube',
      colour: 'border-rose-500/20 hover:border-rose-500/40 text-rose-400',
    },
  ]

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-red-400" />
        </div>
        <div>
          <h1 className="app-heading text-2xl">Admin Panel</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Platform management and oversight</p>
        </div>
      </div>

      {/* Platform stats */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <TrendingUp size={12} /> Platform Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon, accent, bg }) => (
            <div key={label} className={`rounded-xl border ${bg} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <p className={`text-4xl font-bold tracking-tight ${accent}`}>{value}</p>
                <Icon size={15} className="text-zinc-600 mt-1" />
              </div>
              <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Management panels */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {panels.map(({ href, icon: Icon, label, description, colour }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col gap-4 p-5 rounded-xl border bg-zinc-900 transition-all duration-150 hover:bg-zinc-800/60 ${colour}`}
            >
              <div className="flex items-start justify-between">
                <Icon size={20} />
                <ArrowRight size={14} className="text-zinc-600 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
