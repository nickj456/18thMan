import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier, hasClubAccess } from '@/lib/subscription'
import { Check, Lock } from 'lucide-react'
import { CheckoutButton } from '@/components/pricing/CheckoutButton'

export const metadata = { title: 'Pricing — 18th Man' }

const FREE_FEATURES = [
  'Up to 20 drills',
  'Public drill library (unlimited)',
  'Session planning (unlimited)',
  'AI coaching chat (20 messages/day)',
  'Community access',
  'Profile page',
]

const COACH_FEATURES = [
  'Unlimited drills',
  'PDF export',
  'AI coaching chat (unlimited)',
  'All free features included',
]

const COACH_LOCKED = [
  'Club private drills',
  'Coaching groups',
  'Collaborative sessions',
  'AI session guidance',
]

const CLUB_FEATURES = [
  'Everything in Coach Pro',
  'Unlimited coaches in your club',
  'Club private drills',
  'Coaching groups (up to 5)',
  'Collaborative session plans',
  'AI session guidance (GameSense)',
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tier, profileResult] = await Promise.all([
    getEffectiveTier(supabase, user.id),
    supabase.from('profiles').select('club_id').eq('id', user.id).single(),
  ])

  const clubId = profileResult.data?.club_id ?? null
  const isClub = hasClubAccess(tier)
  const isCoach = tier === 'coach'

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">Plans &amp; Pricing</h1>
        <p className="text-zinc-400 text-sm">
          Start free. Upgrade when you need more.
        </p>
      </div>

      {tier === 'trial' && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm text-amber-300">
          <span className="font-medium">Your 48-hour trial is active.</span> You have full club access right now — upgrade before it expires to keep it.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {/* Free */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Free</p>
            <p className="text-2xl font-bold text-white">£0</p>
            <p className="text-xs text-zinc-500 mt-1">Forever</p>
          </div>
          <ul className="space-y-2">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                <Check size={12} className="text-zinc-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-1">
            {tier === 'free' ? (
              <div className="w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs text-center">
                Current plan
              </div>
            ) : (
              <div className="w-full py-2 rounded-lg border border-zinc-800 text-zinc-600 text-xs text-center">
                Free
              </div>
            )}
          </div>
        </div>

        {/* Coach Pro */}
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">Coach Pro</p>
            <p className="text-2xl font-bold text-white">
              £9.99<span className="text-sm font-normal text-zinc-400">/mo</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1">Individual coach · £89/year</p>
          </div>
          <ul className="space-y-2">
            {COACH_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                <Check size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
            {COACH_LOCKED.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-zinc-600">
                <Lock size={12} className="mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-1 space-y-2">
            {isCoach ? (
              <div className="w-full py-2 rounded-lg border border-indigo-500/40 text-indigo-400 text-xs text-center">
                Active plan
              </div>
            ) : isClub ? (
              <div className="w-full py-2 rounded-lg border border-zinc-800 text-zinc-600 text-xs text-center">
                Included in Club
              </div>
            ) : (
              <>
                <CheckoutButton plan="coach_monthly" label="Monthly — £9.99/mo" variant="primary" />
                <CheckoutButton plan="coach_annual" label="Annual — £89/year (save 26%)" variant="secondary" />
              </>
            )}
          </div>
        </div>

        {/* Club */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4 relative">
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Best value
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">Club</p>
            <p className="text-2xl font-bold text-white">
              £24.99<span className="text-sm font-normal text-zinc-400">/mo</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1">Whole club · £219/year</p>
          </div>
          <ul className="space-y-2">
            {CLUB_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                <Check size={12} className="text-amber-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="pt-1 space-y-2">
            {isClub ? (
              <div className="w-full py-2 rounded-lg border border-emerald-500/40 text-emerald-400 text-xs text-center">
                Active plan
              </div>
            ) : (
              <>
                <CheckoutButton plan="club_monthly" clubId={clubId} label="Monthly — £24.99/mo" variant="amber" />
                <CheckoutButton plan="club_annual" clubId={clubId} label="Annual — £219/year (save 27%)" variant="secondary" />
              </>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        Prices in GBP. Club plan covers all coaches in one club — no per-seat fees. Cancel anytime via the Stripe billing portal.
      </p>
    </div>
  )
}
