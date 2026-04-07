import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier, hasClubAccess } from '@/lib/subscription'
import { ManageSubscriptionButton } from '@/components/pricing/ManageSubscriptionButton'
import { CreditCard, CheckCircle2, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings — 18th Man' }

const TIER_LABEL: Record<string, string> = {
  free: 'Free',
  trial: 'Trial (48h full access)',
  coach: 'Coach Pro',
  club: 'Club',
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
      .select('display_name, club_id, subscription_tier, stripe_customer_id')
      .eq('id', user.id)
      .single(),
  ])

  const profile = profileResult.data
  const clubId = profile?.club_id ?? null
  const hasIndividualSub = profile?.subscription_tier === 'coach'
  const isClub = hasClubAccess(tier)

  return (
    <div className="max-w-2xl space-y-8">
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

      {/* Subscription */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold">Subscription</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">{TIER_LABEL[tier] ?? tier}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {tier === 'free' && 'Upgrade to unlock more features'}
              {tier === 'trial' && 'Trial expires in 48 hours — upgrade to keep access'}
              {tier === 'coach' && 'Individual premium features active'}
              {tier === 'club' && 'Full club access — all features unlocked'}
            </p>
          </div>
          {(hasIndividualSub || isClub) && (
            <ManageSubscriptionButton clubId={isClub && !hasIndividualSub ? clubId : null} />
          )}
        </div>

        {tier === 'free' || tier === 'trial' ? (
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            View plans <ArrowRight size={12} />
          </Link>
        ) : null}
      </section>
    </div>
  )
}
