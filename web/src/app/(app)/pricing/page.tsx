import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'
import { Check, Lock, Sparkles } from 'lucide-react'

export const metadata = { title: 'Pricing — 18th Man' }

const FREE_FEATURES = [
  'Up to 20 drills',
  'Public drill library (unlimited)',
  'Session planning (unlimited)',
  'AI coaching chat (20 messages/day)',
  'Community access',
  'Profile page',
]

const CLUB_FEATURES = [
  'Unlimited drills',
  'Club private drills',
  'Coaching groups (up to 5)',
  'Collaborative session plans',
  'AI session guidance (GameSense)',
  'PDF export',
  'AI coaching chat (unlimited)',
  'All free features included',
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tier = await getEffectiveTier(supabase, user.id)

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <h1 className="app-heading text-3xl">Plans &amp; Pricing</h1>
        <p className="text-zinc-400 text-sm">
          One subscription covers your whole coaching staff. No per-seat fees.
        </p>
      </div>

      {tier === 'trial' && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-sm text-amber-300">
          <span className="font-medium">Your 48-hour trial is active.</span> You have full access to all club features right now — upgrade before it expires to keep them.
        </div>
      )}

      {tier === 'club' && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-300">
          <span className="font-medium">You&apos;re on the club plan.</span> You have full access to all features.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Free tier */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Free</p>
            <p className="text-3xl font-bold text-white">£0</p>
            <p className="text-xs text-zinc-500 mt-1">Individual coach, forever</p>
          </div>

          <ul className="space-y-2.5">
            {FREE_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check size={14} className="text-zinc-500 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm text-zinc-600">
              <Lock size={14} className="mt-0.5 shrink-0" />
              Club features
            </li>
          </ul>

          {tier === 'free' ? (
            <div className="w-full py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm text-center">
              Your current plan
            </div>
          ) : (
            <div className="w-full py-2 rounded-lg border border-zinc-800 text-zinc-600 text-sm text-center">
              Free
            </div>
          )}
        </div>

        {/* Club tier */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-5 relative">
          <div className="absolute top-4 right-4">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Recommended
            </span>
          </div>

          <div>
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-1">Club</p>
            <p className="text-3xl font-bold text-white">£19.99<span className="text-base font-normal text-zinc-400">/mo</span></p>
            <p className="text-xs text-zinc-500 mt-1">Per club · covers all coaches · £199/year</p>
          </div>

          <ul className="space-y-2.5">
            {CLUB_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check size={14} className="text-amber-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {tier === 'club' ? (
            <div className="w-full py-2.5 rounded-lg border border-emerald-500/40 text-emerald-400 text-sm text-center">
              Active plan
            </div>
          ) : (
            <div className="w-full py-2.5 rounded-lg bg-amber-500 text-black text-sm font-medium text-center flex items-center justify-center gap-1.5 opacity-60 cursor-not-allowed select-none">
              <Sparkles size={13} />
              Coming soon
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Interested in upgrading your club?</p>
        <p className="text-sm text-zinc-500">
          Online payments are coming soon. In the meantime, get in touch and we&apos;ll set you up manually.
        </p>
        <a
          href="mailto:hello@18thman.app?subject=Club subscription enquiry"
          className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors mt-1"
        >
          Contact us to upgrade →
        </a>
      </div>

      <p className="text-xs text-zinc-600">
        Prices shown in GBP. Club subscription covers all coaches within one club — no per-seat pricing.
        Cancel anytime once Stripe billing is live.
      </p>
    </div>
  )
}
