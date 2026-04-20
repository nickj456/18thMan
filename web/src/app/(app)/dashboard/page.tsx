import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { PenTool, CalendarDays, MessageSquare, Sparkles, ArrowRight, Clock, Users, BookOpen, LayoutList, ChevronRight, Bell, Star, Building2, Users2, MessageCircle, UserPlus, Wand2 } from 'lucide-react'
import { OnboardingChecklist } from './OnboardingChecklist'
import { FocusWidget } from '@/components/weekly-focus/FocusWidget'

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
          const groupName = (block?.coaching_groups as unknown as { name: string } | null)?.name ?? ''
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
              <p className="text-[10px] text-zinc-600">{(drill.category as unknown as { name: string } | null)?.name ?? 'Uncategorised'}</p>
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

// ── Recent notifications ─────────────────────────────────────────
async function RecentNotifications({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!notifications?.length) return null

  function notifIcon(type: string) {
    switch (type) {
      case 'new_dm': return <MessageCircle size={13} className="text-indigo-400" />
      case 'drill_rating': return <Star size={13} className="text-amber-400" />
      case 'club_invite': return <Building2 size={13} className="text-amber-400" />
      case 'group_invite': return <Users2 size={13} className="text-indigo-400" />
      case 'session_scheduled': return <CalendarDays size={13} className="text-amber-400" />
      case 'followed_you': return <UserPlus size={13} className="text-emerald-400" />
      case 'new_drill': return <PenTool size={13} className="text-[#e8560a]" />
      default: return <Bell size={13} className="text-zinc-400" />
    }
  }

  function notifText(n: { type: string; data: Record<string, unknown> }): string {
    const d = n.data as Record<string, string>
    switch (n.type) {
      case 'new_dm': return `${d.sender_display_name} sent you a message`
      case 'drill_rating': return `${d.rater_display_name} rated your drill "${d.drill_title}"`
      case 'club_invite': return `${d.invited_by_display_name} invited you to join ${d.club_name}`
      case 'group_invite': return `${d.invited_by_display_name} invited you to join ${d.group_name}`
      case 'session_scheduled': return `${d.scheduled_by_display_name} scheduled "${d.session_title}"`
      case 'followed_you': return `${d.follower_display_name} started following you`
      case 'new_drill': return `${d.author_display_name} posted a new drill`
      default: return 'New notification'
    }
  }

  function notifHref(n: { type: string; data: Record<string, unknown> }): string {
    const d = n.data as Record<string, string>
    switch (n.type) {
      case 'new_dm': return `/chat/dm/${d.conversation_id}`
      case 'drill_rating': return `/drills/${d.drill_id}#ratings`
      case 'club_invite': return '/clubs'
      case 'group_invite': return '/groups'
      case 'session_scheduled': return `/sessions/${d.session_id}`
      case 'followed_you': return `/profile/${d.follower_username}`
      case 'new_drill': return `/drills/${d.drill_id}`
      default: return '/notifications'
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Bell size={13} className="text-[#e8560a]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Notifications</span>
          <span className="text-[10px] font-bold bg-[#e8560a] text-white rounded-full px-1.5 py-0.5 leading-none">
            {notifications.length}
          </span>
        </div>
        <Link href="/notifications" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors">
          View all <ArrowRight size={11} />
        </Link>
      </div>
      <div className="divide-y divide-zinc-800/60">
        {notifications.map(n => (
          <Link
            key={n.id}
            href={notifHref({ type: n.type, data: n.data as Record<string, unknown> })}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors group"
          >
            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              {notifIcon(n.type)}
            </div>
            <p className="text-xs text-zinc-300 line-clamp-1 flex-1 group-hover:text-white transition-colors">
              {notifText({ type: n.type, data: n.data as Record<string, unknown> })}
            </p>
            <div className="w-1.5 h-1.5 rounded-full bg-[#e8560a] shrink-0" />
          </Link>
        ))}
      </div>
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

  // Weekly focus for the club
  let weeklyFocus: { id: string; topic: string; description: string; next_topic: string | null; drill_ids: string[] } | null = null
  if (profile?.club_id) {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    const monday = d.toISOString().split('T')[0]
    const { data: wf } = await supabase
      .from('weekly_focuses')
      .select('id, topic, description, next_topic, drill_ids')
      .eq('club_id', profile.club_id)
      .eq('week_start', monday)
      .maybeSingle()
    weeklyFocus = wf
  }

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

      {/* Notifications banner ── only shown when there are unread items */}
      <Suspense fallback={null}>
        <RecentNotifications userId={user.id} />
      </Suspense>

      {/* Onboarding checklist ── shown until all steps complete */}
      <OnboardingChecklist
        drillCount={drillCount}
        hasClub={hasClub}
        hasSession={hasSession}
      />

      {/* Generate session CTA ── only shown until first session is created */}
      {!hasSession && (
        <Link
          href={`/chat/ai?prompt=${encodeURIComponent('Plan a 60 minute session for U14s, 12 players, focusing on handling. Give me a full timed run sheet with drills and coaching points.')}`}
          className="flex items-center gap-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5 px-5 py-4 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30 transition-colors">
            <Wand2 size={18} className="text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Generate your first session with AI</p>
            <p className="text-xs text-zinc-500 mt-0.5">Describe what you need — age group, players, focus — and get a full timed run sheet in seconds</p>
          </div>
          <ArrowRight size={16} className="text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Weekly Focus widget */}
      {profile?.club_id && <FocusWidget focus={weeklyFocus} />}

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
