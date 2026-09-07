'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FREE_SESSION_LIMIT, FREE_AI_CHAT_DAILY_LIMIT } from '@/lib/subscription-limits'

type Plan = {
  name: string
  badge?: string
  price: string
  per: string
  sub: string
  border: string
  headBg: string
  headColor: string
  items: string[]
  cta: string
  ctaBg: string
  ctaColor: string
  ctaBorder: string
}

function buildPlans(yearly: boolean): Plan[] {
  return [
    {
      name: 'Free',
      price: '£0',
      per: 'forever',
      sub: 'Everything you need to get started',
      border: 'rgba(255,255,255,0.1)',
      headBg: '#0f1219',
      headColor: '#f4f4f2',
      items: [
        'Drill designer — try free, saving unlocks a 48h trial',
        'Public drill library',
        `Up to ${FREE_SESSION_LIMIT} session plan${FREE_SESSION_LIMIT === 1 ? '' : 's'}`,
        `AI coaching chat (${FREE_AI_CHAT_DAILY_LIMIT}/day)`,
        'Community access',
        'Public profile page',
      ],
      cta: 'Get started free',
      ctaBg: 'transparent',
      ctaColor: '#f4f4f2',
      ctaBorder: 'rgba(244,244,242,0.28)',
    },
    {
      name: 'Coach Pro',
      badge: 'Most popular',
      price: yearly ? '£89' : '£9.99',
      per: yearly ? '/year' : '/month',
      sub: yearly ? 'Billed annually — save 26%' : '£89/year — save 26%',
      border: '#e8560a',
      headBg: '#e8560a',
      headColor: '#fff',
      items: [
        'Unlimited drills',
        'PDF export',
        'Unlimited AI coaching chat',
        'Match Analyst desktop app',
        'All free features included',
      ],
      cta: 'Start Coach Pro →',
      ctaBg: '#e8560a',
      ctaColor: '#fff',
      ctaBorder: '#e8560a',
    },
    {
      name: 'Club',
      badge: 'Best value',
      price: yearly ? '£219' : '£24.99',
      per: yearly ? '/year' : '/month',
      sub: 'Covers your whole club — no per-seat fees',
      border: 'rgba(232,86,10,0.4)',
      headBg: '#0f1219',
      headColor: '#e8560a',
      items: [
        'Everything in Coach Pro',
        'Unlimited coaches in your club',
        'Club private drill library',
        'Coaching groups (up to 5)',
        'Collaborative session plans',
        'AI session guidance (GameSense)',
      ],
      cta: 'Get Club plan →',
      ctaBg: 'transparent',
      ctaColor: '#f4f4f2',
      ctaBorder: '#e8560a',
    },
  ]
}

export function PricingSection() {
  const [yearly, setYearly] = useState(false)
  const plans = buildPlans(yearly)

  const on = { background: '#e8560a', color: '#fff' }
  const off = { background: '#0a0b0f', color: '#a8a6a1' }

  return (
    <>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '1.5rem 3rem',
          marginBottom: '3rem',
        }}
      >
        <div>
          <span className="section-label">Pricing</span>
          <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.8rem,5.5vw,4.8rem)', lineHeight: 0.9, textTransform: 'uppercase', color: '#f4f4f2', marginTop: '0.75rem' }}>
            Start free.
            <br />
            <span style={{ color: '#e8560a' }}>Upgrade when ready.</span>
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(255,255,255,0.08)', padding: '2px' }}>
          <button
            type="button"
            onClick={() => setYearly(false)}
            className="lp-display"
            style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              border: 'none',
              cursor: 'pointer',
              ...(yearly ? off : on),
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className="lp-display"
            style={{
              fontWeight: 800,
              fontSize: '0.9rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              border: 'none',
              cursor: 'pointer',
              ...(yearly ? on : off),
            }}
          >
            Yearly <span style={{ color: yearly ? '#fff' : '#e8560a' }}>−26%</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,290px),1fr))', gap: '1.25rem', alignItems: 'stretch' }}>
        {plans.map(p => (
          <div key={p.name} style={{ background: '#0a0b0f', border: `1px solid ${p.border}`, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ background: p.headBg, color: p.headColor, padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{p.name}</span>
              {p.badge && (
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', border: '1.5px solid currentColor', padding: '4px 10px' }}>
                  {p.badge}
                </span>
              )}
            </div>
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '3.6rem', color: '#f4f4f2', lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontSize: '0.85rem', color: '#a8a6a1' }}>{p.per}</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#a8a6a1', marginTop: '8px', minHeight: '1.3em' }}>{p.sub}</p>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '1.5rem 0' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {p.items.map(it => (
                  <div key={it} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.88rem', color: '#d6d3cc', lineHeight: 1.45 }}>
                    <span style={{ color: '#e8560a', fontWeight: 700, flexShrink: 0 }}>✓</span>{it}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                <Link
                  href="/signup"
                  className="lp-display btn-angled btn-plan-cta"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: p.ctaBg,
                    color: p.ctaColor,
                    border: `1.5px solid ${p.ctaBorder}`,
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontSize: '1.05rem',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '14px 20px',
                    textDecoration: 'none',
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '1.75rem', fontSize: '0.8rem', color: '#a8a6a1' }}>
        Prices in GBP. Club plan covers all coaches in one club — no per-seat fees. Cancel anytime. Coach Pro and Club include the Match Analyst desktop app.
      </p>
    </>
  )
}
