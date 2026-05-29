import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Users, Mail } from 'lucide-react'
import { UserRoleSelect } from './UserRoleSelect'
import { DeleteUserButton } from './DeleteUserButton'
import type { UserRole, SubscriptionTier } from '@/lib/supabase/types'

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export const metadata = { title: 'User Management — Admin' }

const roleColour: Record<string, string> = {
  admin: 'bg-red-500/10 text-red-400 border-red-500/20',
  coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  viewer: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
}

const tierColour: Record<string, string> = {
  free: 'bg-zinc-500/10 text-zinc-400 border-zinc-700',
  trial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  coach: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  club: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const tierLabel: Record<string, string> = {
  free: 'Free',
  trial: 'Free Trial',
  coach: 'Coach Pro',
  club: 'Club',
}

function TierBadge({
  tier,
  trialEndsAt,
  stripeSubscriptionId,
  clubName,
}: {
  tier: SubscriptionTier
  trialEndsAt: string | null
  stripeSubscriptionId: string | null
  clubName: string | null
}) {
  const isOnTrial = !clubName && trialEndsAt && new Date(trialEndsAt) > new Date()
  const effectiveKey = clubName ? 'club' : isOnTrial ? 'trial' : tier
  const colour = tierColour[effectiveKey] ?? tierColour.free

  const label = clubName
    ? `Club – ${clubName}`
    : tierLabel[effectiveKey] ?? tier

  const trialExpiry = isOnTrial
    ? new Date(trialEndsAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${colour}`}>
        {label}
      </span>
      {isOnTrial && (
        <span className="text-xs text-amber-500/70">Expires {trialExpiry}</span>
      )}
      {!isOnTrial && !clubName && stripeSubscriptionId && tier !== 'free' && (
        <span className="text-xs text-zinc-500">Stripe active</span>
      )}
      {!isOnTrial && !clubName && !stripeSubscriptionId && tier !== 'free' && (
        <span className="text-xs text-red-400/70">No Stripe sub</span>
      )}
    </div>
  )
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; tab?: string }>
}) {
  const { q, role: roleFilter, tab = 'users' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') redirect('/dashboard')

  // ── Users tab data ──────────────────────────────────────────────────────
  let query = supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, club, club_id, role, subscription_tier, stripe_subscription_id, trial_ends_at, created_at')
    .order('created_at', { ascending: false })

  if (roleFilter && ['admin', 'coach', 'viewer'].includes(roleFilter)) {
    query = query.eq('role', roleFilter)
  }
  if (q) {
    query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
  }

  const { data: profiles } = await query

  // Fetch last sign-in for all users via auth admin API
  const service = createServiceClient()
  const lastSeenMap = new Map<string, string | null>()
  try {
    const { data: authUsers } = await service.auth.admin.listUsers({ perPage: 1000 })
    for (const u of authUsers?.users ?? []) {
      lastSeenMap.set(u.id, u.last_sign_in_at ?? null)
    }
  } catch { /* non-fatal — page still works without it */ }

  const clubIds = [...new Set((profiles ?? []).map(p => p.club_id).filter(Boolean))] as string[]
  const { data: clubsData } = clubIds.length > 0
    ? await supabase.from('clubs').select('id, name').in('id', clubIds)
    : { data: [] }
  const clubMap = Object.fromEntries((clubsData ?? []).map(c => [c.id, c.name]))

  const counts = {
    all: profiles?.length ?? 0,
    admin: profiles?.filter(p => p.role === 'admin').length ?? 0,
    coach: profiles?.filter(p => p.role === 'coach').length ?? 0,
    viewer: profiles?.filter(p => p.role === 'viewer').length ?? 0,
  }

  // ── Leads tab data ──────────────────────────────────────────────────────
  const { data: leads } = await supabase
    .from('leads')
    .select('id, email, age_group, source, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors">
        <ArrowLeft size={12} /> Admin Panel
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="app-heading text-2xl flex items-center gap-2">
            <Users size={20} className="text-indigo-400" /> User Management
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{counts.all} users · {leads?.length ?? 0} leads</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { key: 'users', label: 'Users', count: counts.all },
          { key: 'leads', label: 'Leads', count: leads?.length ?? 0 },
        ].map(t => (
          <Link
            key={t.key}
            href={`/admin/users?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-zinc-600">{t.count}</span>
          </Link>
        ))}
      </div>

      {tab === 'users' && (
        <>
          {/* Filters */}
          <form method="GET" className="flex flex-wrap gap-2 items-center">
            <input type="hidden" name="tab" value="users" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name or username…"
              className="text-sm bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            <div className="flex gap-1">
              {(['', 'admin', 'coach', 'viewer'] as const).map(r => (
                <Link
                  key={r || 'all'}
                  href={`/admin/users?tab=users${r ? `&role=${r}` : ''}${q ? `&q=${q}` : ''}`}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    (roleFilter ?? '') === r
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {r || 'All'} {r === '' ? `(${counts.all})` : r === 'admin' ? `(${counts.admin})` : r === 'coach' ? `(${counts.coach})` : `(${counts.viewer})`}
                </Link>
              ))}
            </div>
          </form>

          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">User</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Club</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Tier</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Joined</th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Last seen</th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Role</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                  {!profiles?.length ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-zinc-600">No users found</td>
                    </tr>
                  ) : (
                    profiles.map(profile => (
                      <tr key={profile.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage src={profile.avatar_url ?? ''} />
                              <AvatarFallback className="text-xs bg-zinc-800">
                                {profile.display_name?.[0]?.toUpperCase() ?? profile.username?.[0]?.toUpperCase() ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-zinc-200">{profile.display_name ?? profile.username}</p>
                              <p className="text-xs text-zinc-600">@{profile.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">
                          {(profile.club_id ? clubMap[profile.club_id] : null) ?? profile.club ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <TierBadge
                            tier={profile.subscription_tier as SubscriptionTier}
                            trialEndsAt={profile.trial_ends_at}
                            stripeSubscriptionId={profile.stripe_subscription_id}
                            clubName={profile.club_id ? (clubMap[profile.club_id] ?? null) : null}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs">
                          {new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-3.5 text-xs">
                          {(() => {
                            const t = timeAgo(lastSeenMap.get(profile.id) ?? null)
                            const isRecent = t === 'Just now' || t.endsWith('m ago') || t.endsWith('h ago')
                            return (
                              <span className={isRecent ? 'text-emerald-400' : 'text-zinc-600'}>
                                {t}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <UserRoleSelect
                            userId={profile.id}
                            currentRole={profile.role as UserRole}
                            isSelf={profile.id === user.id}
                          />
                        </td>
                        <td className="px-3 py-3.5">
                          {profile.id !== user.id && (
                            <DeleteUserButton
                              userId={profile.id}
                              displayName={profile.display_name ?? profile.username ?? 'User'}
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'leads' && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    <span className="flex items-center gap-1.5"><Mail size={11} /> Email</span>
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Age Group</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Source</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">Signed Up</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-900">
                {!leads?.length ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-600">No leads yet</td>
                  </tr>
                ) : (
                  leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-zinc-200">{lead.email}</td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">{lead.age_group ?? '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#e8560a]/10 text-[#e8560a] border border-[#e8560a]/20">
                          {lead.source}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' '}
                        <span className="text-zinc-600">
                          {new Date(lead.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
