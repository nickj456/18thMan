import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier, hasClubAccess } from '@/lib/subscription'
import { Check, Lock } from 'lucide-react'
import { CheckoutButton } from '@/components/pricing/CheckoutButton'
import { ClubCheckoutButton } from '@/components/pricing/ClubCheckoutButton'

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

  let tier: string = 'free'
  let clubId: string | null = null
  let isClub = false
  let isCoach = false

  if (user) {
    const [effectiveTier, profileResult] = await Promise.all([
      getEffectiveTier(supabase, user.id),
      supabase.from('profiles').select('club_id').eq('id', user.id).single(),
    ])
    tier = effectiveTier
    clubId = profileResult.data?.club_id ?? null
    isClub = hasClubAccess(effectiveTier)
    isCoach = effectiveTier === 'coach'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '60px 16px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 24 }}>
            <Link href="/" style={{ color: '#e8560a', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>
              ← Back to 18th Man
            </Link>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
            Plans &amp; Pricing
          </h1>
          <p style={{ fontSize: 15, color: '#71717a', margin: 0 }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        {tier === 'trial' && (
          <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', marginBottom: 32, fontSize: 14, color: '#fbbf24' }}>
            <span style={{ fontWeight: 600 }}>Your 48-hour trial is active.</span> You have full club access right now — upgrade before it expires to keep it.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
          {/* Free */}
          <div style={{ borderRadius: 16, border: '1px solid #27272a', background: 'rgba(24,24,27,0.5)', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Free</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>£0</p>
              <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>Forever</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#d4d4d8' }}>
                  <Check size={12} style={{ color: '#52525b', marginTop: 2, flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link href="/signup" style={{ display: 'block', width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: 13, textAlign: 'center', textDecoration: 'none', fontWeight: 500, boxSizing: 'border-box' }}>
                Get started free
              </Link>
            ) : tier === 'free' ? (
              <div style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #3f3f46', color: '#71717a', fontSize: 13, textAlign: 'center' }}>
                Current plan
              </div>
            ) : (
              <div style={{ width: '100%', padding: '9px 0', borderRadius: 8, border: '1px solid #27272a', color: '#52525b', fontSize: 13, textAlign: 'center' }}>
                Free
              </div>
            )}
          </div>

          {/* Coach Pro */}
          <div style={{ borderRadius: 16, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.05)', padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Coach Pro</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>
                £9.99<span style={{ fontSize: 14, fontWeight: 400, color: '#71717a' }}>/mo</span>
              </p>
              <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>Individual coach · £89/year</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {COACH_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#d4d4d8' }}>
                  <Check size={12} style={{ color: '#818cf8', marginTop: 2, flexShrink: 0 }} />
                  {f}
                </li>
              ))}
              {COACH_LOCKED.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#52525b' }}>
                  <Lock size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/signup" style={{ display: 'block', padding: '9px 0', borderRadius: 8, background: '#6366f1', color: '#fff', fontSize: 13, textAlign: 'center', textDecoration: 'none', fontWeight: 600 }}>
                  Monthly — £9.99/mo
                </Link>
                <Link href="/signup" style={{ display: 'block', padding: '9px 0', borderRadius: 8, border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: 13, textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>
                  Annual — £89/year (save 26%)
                </Link>
              </div>
            ) : isCoach ? (
              <div style={{ padding: '9px 0', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8', fontSize: 13, textAlign: 'center' }}>
                Active plan
              </div>
            ) : isClub ? (
              <div style={{ padding: '9px 0', borderRadius: 8, border: '1px solid #27272a', color: '#52525b', fontSize: 13, textAlign: 'center' }}>
                Included in Club
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CheckoutButton plan="coach_monthly" label="Monthly — £9.99/mo" variant="primary" />
                <CheckoutButton plan="coach_annual" label="Annual — £89/year (save 26%)" variant="secondary" />
              </div>
            )}
          </div>

          {/* Club */}
          <div style={{ borderRadius: 16, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)', padding: 20, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
              Best value
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>Club</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>
                £24.99<span style={{ fontSize: 14, fontWeight: 400, color: '#71717a' }}>/mo</span>
              </p>
              <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>Whole club · £219/year</p>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CLUB_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#d4d4d8' }}>
                  <Check size={12} style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            {!user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/signup" style={{ display: 'block', padding: '9px 0', borderRadius: 8, background: '#f59e0b', color: '#000', fontSize: 13, textAlign: 'center', textDecoration: 'none', fontWeight: 700 }}>
                  Monthly — £24.99/mo
                </Link>
                <Link href="/signup" style={{ display: 'block', padding: '9px 0', borderRadius: 8, border: '1px solid #3f3f46', color: '#a1a1aa', fontSize: 13, textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>
                  Annual — £219/year (save 27%)
                </Link>
              </div>
            ) : isClub ? (
              <div style={{ padding: '9px 0', borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', fontSize: 13, textAlign: 'center' }}>
                Active plan
              </div>
            ) : clubId ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <CheckoutButton plan="club_monthly" clubId={clubId} label="Monthly — £24.99/mo" variant="amber" />
                <CheckoutButton plan="club_annual" clubId={clubId} label="Annual — £219/year (save 27%)" variant="secondary" />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <ClubCheckoutButton plan="club_monthly" label="Monthly — £24.99/mo" variant="amber" />
                <ClubCheckoutButton plan="club_annual" label="Annual — £219/year (save 27%)" variant="secondary" />
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#3f3f46', margin: 0 }}>
          Prices in GBP. Club plan covers all coaches in one club — no per-seat fees. Cancel anytime via the Stripe billing portal.
        </p>
      </div>
    </div>
  )
}
