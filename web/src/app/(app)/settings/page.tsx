import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier, hasClubAccess } from '@/lib/subscription'
import { ManageSubscriptionButton } from '@/components/pricing/ManageSubscriptionButton'
import {
  CreditCard,
  CheckCircle2,
  ArrowRight,
  User,
  Mail,
  Shield,
  Pencil,
  Zap,
  Crown,
  Building2,
  Bell,
  HelpCircle,
  Scale,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings — 18th Man' }

const TIER_CONFIG: Record<string, { label: string; description: string; color: string; icon: typeof Zap }> = {
  free: {
    label: 'Free',
    description: 'Basic access — upgrade to unlock more features',
    color: 'text-zinc-400 bg-zinc-800 border-zinc-700',
    icon: User,
  },
  trial: {
    label: 'Trial',
    description: '48-hour full access trial — upgrade to keep access',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: Zap,
  },
  coach: {
    label: 'Coach Pro',
    description: 'Individual premium features active',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    icon: Zap,
  },
  club: {
    label: 'Club',
    description: 'Full club access — all features unlocked',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    icon: Crown,
  },
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>
}) {
  const { upgraded } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tier, profileResult] = await Promise.all([
    getEffectiveTier(supabase, user.id),
    supabase
      .from('profiles')
      .select('display_name, username, avatar_url, coaching_level, club_id, subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single(),
  ])

  const profile = profileResult.data
  const clubId = profile?.club_id ?? null
  const hasIndividualSub = profile?.subscription_tier === 'coach'
  const isClub = hasClubAccess(tier)
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.free
  const TierIcon = tierConfig.icon

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="app-heading text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and subscription</p>
      </div>

      {upgraded && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-300">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Subscription activated!</p>
            <p className="text-emerald-400/70 mt-0.5 text-xs">
              {upgraded === 'club' ? 'Your club now has full access to all features.' : 'Your Coach Pro features are now active.'}
            </p>
          </div>
        </div>
      )}

      {/* Account */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <User size={15} className="text-zinc-400" />
            <h2 className="text-sm font-semibold">Account</h2>
          </div>
          <Link
            href={`/profile/${profile?.username ?? ''}/edit`}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Pencil size={12} />
            Edit profile
          </Link>
        </div>
        <div className="px-6 py-5 flex items-center gap-4">
          {profile?.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name ?? ''}
              width={52}
              height={52}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="size-[52px] rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
              <User size={22} />
            </div>
          )}
          <div className="space-y-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">{profile?.display_name ?? 'No name set'}</p>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Mail size={11} />
              {user.email}
            </div>
            {profile?.coaching_level && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Shield size={11} />
                {profile.coaching_level}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Subscription */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <CreditCard size={15} className="text-zinc-400" />
          <h2 className="text-sm font-semibold">Subscription</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-lg border flex items-center justify-center ${tierConfig.color}`}>
                <TierIcon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{tierConfig.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{tierConfig.description}</p>
              </div>
            </div>
            {(hasIndividualSub || isClub) && (
              <ManageSubscriptionButton clubId={isClub && !hasIndividualSub ? clubId : null} />
            )}
          </div>

          {(tier === 'free' || tier === 'trial') && (
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <p className="text-xs text-zinc-500">Unlock unlimited drills, AI chat, PDF export and more</p>
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                View plans <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Quick links */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {[
            { href: '/pricing', icon: Zap, label: 'View plans', description: 'Compare Coach Pro and Club tiers' },
            { href: '/clubs', icon: Building2, label: 'My Club', description: 'Manage your club membership' },
            { href: '/notifications', icon: Bell, label: 'Notifications', description: 'View your notifications' },
            { href: '/how-to', icon: HelpCircle, label: 'How To', description: 'Guides and tips for using 18th Man' },
            { href: '/legal/terms', icon: Scale, label: 'Legal', description: 'Terms of service and privacy policy' },
          ].map(({ href, icon: Icon, label, description }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors">
                <Icon size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
