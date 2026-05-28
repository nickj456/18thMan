'use client'

import { useState } from 'react'

type Feature = {
  icon: string
  title: string
  body: string
  accent: string
  border: string
  detail: {
    headline: string
    points: string[]
  }
}

const features: Feature[] = [
  {
    icon: '⚡',
    title: 'AI Session Planning',
    body: 'Describe what you need and get a full timed run sheet in seconds.',
    accent: 'rgba(232,86,10,0.2)',
    border: 'rgba(232,86,10,0.35)',
    detail: {
      headline: 'Your coaching knowledge, amplified.',
      points: [
        'Ask anything — drills, tactics, player development, game plans',
        'Understands rugby league language: sets, structures, positions, Game Sense',
        'Generates a full timed run sheet with drills and coaching points',
        'Pre-loaded prompts get you started in one tap',
        'Unlimited questions — no whiteboard required',
      ],
    },
  },
  {
    icon: '🗓️',
    title: 'Coaching Blocks',
    body: 'AI plans your whole training block upfront — every session balanced across all four focus areas.',
    accent: 'rgba(74,222,128,0.1)',
    border: 'rgba(74,222,128,0.25)',
    detail: {
      headline: 'Your whole season structured before it starts.',
      points: [
        'Name your block, set the number of sessions — AI does the rest',
        'Balanced across Attack, Defence, Completions & Skills in every block',
        'Swap sessions when the team struggles — rotation stays intact',
        'Prepare each session with your own drills alongside the AI plan',
        'Track progress across the full block',
      ],
    },
  },
  {
    icon: '📊',
    title: 'Game Stats',
    body: 'Track carries, tackles, and set completions live on the sideline. Review workload data after.',
    accent: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.3)',
    detail: {
      headline: 'Data-driven coaching without the clipboard.',
      points: [
        'One tap per event — carries, tackles, set completions',
        'Runs on your phone on the sideline, no paper needed',
        'Half-by-half breakdown to spot where the team fades',
        'Workload % per player — see who\'s doing the heavy lifting',
        'Export a full match report as a PDF',
      ],
    },
  },
  {
    icon: '✏️',
    title: 'Drill Designer',
    body: 'Draw drills on a digital pitch canvas. Build your library and share with the community.',
    accent: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    detail: {
      headline: 'Your drills, your way — on a digital pitch.',
      points: [
        'Drag and drop attackers, defenders, cones, arrows, and zones',
        'Full pitch, half pitch, in-goal, or blank canvas',
        'Add YouTube video links for visual reference',
        'AI automatically generates coaching points for every drill',
        'Keep drills private or share with the coaching community',
      ],
    },
  },
]

export function FeatureGrid() {
  const [active, setActive] = useState<Feature | null>(null)

  return (
    <>
      {/* Feature grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem',
          width: '100%',
          maxWidth: '640px',
        }}
      >
        {features.map(f => (
          <button
            key={f.title}
            onClick={() => setActive(f)}
            style={{
              background: f.accent,
              border: `1px solid ${f.border}`,
              borderRadius: '12px',
              padding: '1.1rem 1.25rem',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'transform 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{f.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem', color: '#fff', fontFamily: 'var(--font-barlow), system-ui, sans-serif' }}>
              {f.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#7a7875', lineHeight: 1.55, fontFamily: 'system-ui', marginBottom: '0.6rem' }}>
              {f.body}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#e8560a', fontWeight: 700, letterSpacing: '0.06em', fontFamily: 'var(--font-barlow), system-ui, sans-serif', textTransform: 'uppercase' }}>
              Learn more →
            </div>
          </button>
        ))}
      </div>

      {/* Modal overlay */}
      {active && (
        <div
          onClick={() => setActive(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0d0f16',
              border: `1px solid ${active.border}`,
              borderRadius: '20px',
              padding: '2.5rem',
              width: '100%',
              maxWidth: '580px',
              animation: 'popIn 0.2s cubic-bezier(.22,.6,.36,1)',
            }}
          >
            <style>{`
              @keyframes popIn {
                from { transform: scale(0.94); opacity: 0; }
                to   { transform: scale(1);    opacity: 1; }
              }
            `}</style>

            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{active.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '1.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', marginBottom: '0.5rem', fontFamily: 'var(--font-barlow), system-ui, sans-serif' }}>
              {active.title}
            </div>
            <div style={{ fontSize: '1.05rem', color: '#7a7875', marginBottom: '1.75rem', fontFamily: 'system-ui' }}>
              {active.detail.headline}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
              {active.detail.points.map(pt => (
                <div key={pt} style={{ display: 'flex', gap: '12px', fontSize: '1.05rem', color: '#c4c0b8', lineHeight: 1.55, fontFamily: 'system-ui' }}>
                  <span style={{ color: '#e8560a', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>→</span>
                  {pt}
                </div>
              ))}
            </div>

            <button
              onClick={() => setActive(null)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: '#a0a0a0',
                fontSize: '1rem',
                cursor: 'pointer',
                fontFamily: 'system-ui',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
