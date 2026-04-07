import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PenTool, CalendarDays, MessageSquare, Sparkles, ArrowRight, Clock, Users, BookOpen, LayoutList, ChevronRight } from 'lucide-react'
import { OnboardingChecklist } from './OnboardingChecklist'

export const metadata = { title: 'Dashboard — 18th Man' }

// ── Quick actions (static — zero DB, renders instantly) ─────────
function QuickActions() {
  const actions = [
    { href: '/drills/new', icon: PenTool, label: 'New Drill', description: 'Design on canvas', colour: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-400' },
    { href: '/sessions', icon: CalendarDays, label: 'New Session', description: 'Plan training', colour: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 text-emerald-400' },
    { href: '/chat/ai', icon: Sparkles, label: 'Ask AI Coach', description: 'Get instant advice', colour: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 text-amber-400' },
    { href: '/chat/community', icon: MessageSquare, label: 'Community', description: 'Join discussions', colour: 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 hover:border-rose-500/40 text-rose-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map(({ href, icon: Icon, label, description, colour }) => (
        <Link key={href} href={href}
          className={`flex flex-col gap-2 p-4 rounded-xl border transition-all duration-150 group ${colour}`}
        >
          <Icon size={20} />
          <div>
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Stat skeleton ────────────────────────────────────────────────
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
          <div className="h-8 w-16 bg-zinc-800 rounded mb-2" />
          <div className="h-3 w-20 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  )
}

function DrillsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden animate-pulse">
          <div className="aspect-video bg-zinc-800" />
          <div className="p-3 space-y-1.5">
            <div className="h-3 w-3/4 bg-zinc-800 rounded" />
            <div className="h-3 w-1/2 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 animate-pulse space-y-3">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="h-12 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Upcoming block sessions ──────────────────────────────────────
function BlockSessionsSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
        <div className="h-3.5 w-3.5 bg-zinc-800 rounded" />
        <div className="h-3 w-32 bg-zinc-800 rounded" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="px-5 py-3.5 border-b border-zinc-800 last:border-0 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-zinc-800 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 bg-zinc-800 rounded" />
            <div className="h-2.5 w-1/3 bg-zinc-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

const categoryColour: Record<string, string> = {
  'Attack': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Defence': 'text-red-400 bg-red-500/10 border-red-500/20',
  'Completions & Game Management': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Skills in Context': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
}

async function UpcomingBlockSessions({ userId }: { userId: string }) {
  const supabase = await createClient()

  // Get groups the user is a member of
  const { data: memberships } = await supabase
    .from('group_invitations')
    .select('group_id')
    .eq('user_id', userId)
    .eq('status', 'accepted')

  if (!memberships?.length) return null

  const groupIds = memberships.map(m => m.group_id)

  // Get active blocks for those groups
  const { data: blocks } = await supabase
    .from('coaching_blocks')
    .select('id, name, group_id, total_sessions, coaching_groups(name)')
    .in('group_id', groupIds)
    .eq('status', 'active')

  if (!blocks?.length) return null

  const blockIds = blocks.map(b => b.id)
  const blockMap = new Map(blocks.map(b => [b.id, b]))

  // Get next upcoming sessions (not completed)
  const { data: sessions } = await supabase
    .from('block_sessions')
    .select('id, block_id, session_number, focus_area, category, status, scheduled_date')
    .in('block_id', blockIds)
    .neq('status', 'completed')
    .order('session_number', { ascending: true })
    .limit(6)

  if (!sessions?.length) return null

  // Show only the next 1-2 sessions per block to avoid clutter
  const seenBlocks = new Map<string, number>()
  const upcoming = sessions.filter(s => {
    const count = seenBlocks.get(s.block_id) ?? 0
    if (count >= 2) return false
    seenBlocks.set(s.block_id, count + 1)
    return true
  })

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <LayoutList size={14} className="text-[#e8560a]" />
          <h2 className="text-sm font-semibold">Upcoming Block Sessions</h2>
        </div>
        <Link href="/groups" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
          My groups <ArrowRight size={11} />
        </Link>
      </div>
      <div className="divide-y divide-zinc-800">
        {upcoming.map(session => {
          const block = blockMap.get(session.block_id)
          const groupName = (block?.coaching_groups as any)?.name ?? ''
          const catClass = categoryColour[session.category] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'
          const shortCat = session.category === 'Completions & Game Management' ? 'Completions' : session.category
          return (
            <Link
              key={session.id}
              href={`/groups/${block?.group_id}/blocks/${session.block_id}/session/${session.session_number}`}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono text-zinc-400">{session.session_number}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                  {session.focus_area}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {groupName} · {block?.name}
                  {session.scheduled_date && (
                    <span className="text-amber-400 ml-1.5">
                      · {new Date(session.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${catClass}`}>
                {shortCat}
              </span>
              <ChevronRight size={13} className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Stats ────────────────────────────────────────────────────────
async function Stats({ userId }: { userId: string }) {
  const supabase = await createClient()

  const [drillsRes, sessionsRes, repliesRes, savedRes] = await Promise.all([
    supabase.from('drills').select('id', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('session_plans').select('id', { count: 'exact', head: true }).eq('coach_id', userId),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_id', userId),
    supabase.from('drill_saves').select('drill_id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const stats = [
    { label: 'Drills created', value: drillsRes.count ?? 0, icon: PenTool, accent: 'text-indigo-400' },
    { label: 'Sessions built', value: sessionsRes.count ?? 0, icon: CalendarDays, accent: 'text-emerald-400' },
    { label: 'Drills saved', value: savedRes.count ?? 0, icon: BookOpen, accent: 'text-amber-400' },
    { label: 'Community posts', value: repliesRes.count ?? 0, icon: MessageSquare, accent: 'text-rose-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(({ label, value, icon: Icon, accent }) => (
        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-start justify-between mb-3">
            <p className={`text-4xl font-bold tracking-tight ${accent}`}>{value}</p>
            <Icon size={15} className="text-zinc-600 mt-1" />
          </div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Recent drills ────────────────────────────────────────────────
async function RecentDrills({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: drills } = await supabase
    .from('drills')
    .select('id, title, difficulty, preview_image_url, category:drill_categories(name)')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .limit(4)

  if (!drills?.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
        <PenTool size={24} className="text-zinc-700 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">No drills yet</p>
        <Link href="/drills/new" className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
          Design your first drill →
        </Link>
      </div>
    )
  }

  const diffColour: Record<string, string> = {
    beginner: 'text-emerald-400',
    intermediate: 'text-amber-400',
    advanced: 'text-red-400',
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {drills.map(drill => (
        <Link key={drill.id} href={`/drills/${drill.id}`}
          className="group rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-colors"
        >
          <div className="relative aspect-video bg-zinc-800">
            {drill.preview_image_url ? (
              <Image src={drill.preview_image_url} alt={drill.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-20">🏉</div>
            )}
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-zinc-200 line-clamp-1">{drill.title}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-zinc-600">{(drill.category as any)?.name ?? 'Uncategorised'}</p>
              {drill.difficulty && (
                <p className={`text-[10px] font-medium capitalize ${diffColour[drill.difficulty] ?? 'text-zinc-500'}`}>
                  {drill.difficulty}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ── Recent sessions ──────────────────────────────────────────────
async function RecentSessions({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('session_plans')
    .select('id, title, total_duration, drills_order, created_at')
    .eq('coach_id', userId)
    .order('created_at', { ascending: false })
    .limit(4)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-emerald-400" />
          <h2 className="text-sm font-semibold">Recent Sessions</h2>
        </div>
        <Link href="/sessions" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
          View all <ArrowRight size={11} />
        </Link>
      </div>
      {!sessions?.length ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-600">No sessions yet</p>
          <Link href="/sessions" className="text-xs text-emerald-400 hover:text-emerald-300 mt-1 inline-block">
            Plan your first session →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {sessions.map(session => {
            const drillCount = Array.isArray(session.drills_order) ? session.drills_order.length : 0
            return (
              <Link key={session.id} href={`/sessions/${session.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{session.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{drillCount} drill{drillCount !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0 ml-4">
                  <Clock size={11} />
                  {session.total_duration ? `${session.total_duration}m` : '—'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Community pulse ──────────────────────────────────────────────
async function CommunityPulse() {
  const supabase = await createClient()

  const { data: threads } = await supabase
    .from('conversations')
    .select('id, title, message_count, is_pinned, updated_at')
    .eq('type', 'community')
    .eq('is_closed', false)
    .order('updated_at', { ascending: false })
    .limit(4)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-rose-400" />
          <h2 className="text-sm font-semibold">Community</h2>
        </div>
        <Link href="/chat/community" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
          View all <ArrowRight size={11} />
        </Link>
      </div>
      {!threads?.length ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-zinc-600">No discussions yet</p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800">
          {threads.map(thread => (
            <Link key={thread.id} href={`/chat/community/${thread.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 line-clamp-1 group-hover:text-white transition-colors">
                  {thread.is_pinned && <span className="text-indigo-400 mr-1">📌</span>}
                  {thread.title}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">
                  {new Date(thread.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-zinc-600 flex-shrink-0 ml-4">
                <Users size={11} />
                {thread.message_count ?? 0}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role, club, club_id')
    .eq('id', user.id)
    .single()

  // Onboarding data — fetched in parallel, lightweight
  const [drillCountRes, sessionCountRes] = await Promise.all([
    supabase.from('drills').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
    supabase.from('session_plans').select('id', { count: 'exact', head: true }).eq('coach_id', user.id),
  ])
  const drillCount = drillCountRes.count ?? 0
  const hasSession = (sessionCountRes.count ?? 0) > 0
  const hasClub = !!profile?.club_id
  const isNewUser = drillCount === 0 && !hasSession && !hasClub

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Coach'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const roleColour: Record<string, string> = {
    admin: 'bg-red-500/10 text-red-400 border-red-500/20',
    coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    viewer: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Welcome ── renders instantly, no extra DB calls */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mb-1">{greeting}</p>
          <h1 className="app-heading text-3xl">{displayName}</h1>
          {profile?.club && (
            <p className="text-sm text-zinc-500 mt-1">{profile.club}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize mt-1 ${roleColour[profile?.role ?? 'viewer']}`}>
          {profile?.role ?? 'viewer'}
        </span>
      </div>

      {/* Onboarding checklist ── shown until all steps complete */}
      <OnboardingChecklist
        drillCount={drillCount}
        hasClub={hasClub}
        hasSession={hasSession}
      />

      {/* Quick actions ── static, no DB */}
      <QuickActions />

      {/* Upcoming block sessions */}
      <Suspense fallback={<BlockSessionsSkeleton />}>
        <UpcomingBlockSessions userId={user.id} />
      </Suspense>

      {/* Stats ── parallel queries, suspense fallback */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Your stats</h2>
        <Suspense fallback={<StatsSkeleton />}>
          <Stats userId={user.id} />
        </Suspense>
      </section>

      {/* Recent drills */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Your drills</h2>
          <Link href="/drills" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
            View library <ArrowRight size={11} />
          </Link>
        </div>
        <Suspense fallback={<DrillsSkeleton />}>
          <RecentDrills userId={user.id} />
        </Suspense>
      </section>

      {/* Sessions + Community */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Activity</h2>
        <Suspense fallback={<ActivitySkeleton />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RecentSessions userId={user.id} />
            <CommunityPulse />
          </div>
        </Suspense>
      </section>

    </div>
  )
}
