import Link from 'next/link'
import Image from 'next/image'
import { Barlow_Condensed, Source_Serif_4 } from 'next/font/google'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveTier } from '@/lib/subscription'

const barlow = Barlow_Condensed({
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

const serif = Source_Serif_4({
  weight: ['300', '400', '600'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata = {
  title: 'Match Analyst — Desktop Video Analysis for Rugby League Coaches',
  description:
    'Tag player stats against match video, export highlight clips, and generate PDF match reports. A free desktop app for rugby league coaches.',
}

const DOWNLOAD_WIN = 'https://github.com/nickj456/18thMan/releases/latest/download/18thMan-Match-Analyst-Setup.exe'
const DOWNLOAD_MAC = 'https://github.com/nickj456/18thMan/releases/latest/download/18thMan-Match-Analyst.dmg'
const APP_VERSION = '1.7.6'

export default async function AnalystPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let canDownload = false
  if (user) {
    const [tier, profileResult] = await Promise.all([
      getEffectiveTier(supabase, user.id),
      supabase.from('profiles').select('club_id').eq('id', user.id).single(),
    ])
    const isInClub = profileResult.data?.club_id != null
    canDownload = isInClub || tier !== 'free'
  }
  return (
    <>
      <style>{`
        :root {
          --ember: #e8560a;
          --ember-dim: #b8440a;
          --pitch: #0a2b14;
          --bg: #07080d;
          --surface: #0d0f16;
          --surface2: #12151e;
          --border-subtle: rgba(255,255,255,0.06);
          --text: #e8e4dc;
          --text-muted: #7a7875;
          --text-dim: #4a4845;
        }
        .lp { font-family: var(--font-serif), Georgia, serif; }
        .lp-display { font-family: var(--font-barlow), system-ui, sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,86,10,0); }
          50%       { box-shadow: 0 0 32px 4px rgba(232,86,10,0.18); }
        }

        .reveal-0 { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.1s both; }
        .reveal-1 { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.25s both; }
        .reveal-2 { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.4s both; }
        .reveal-3 { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.55s both; }
        .reveal-4 { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.7s both; }
        .reveal-fade { animation: fadeIn 1.2s ease 0.2s both; }

        .ember-line {
          display: block;
          height: 2px;
          background: var(--ember);
          transform-origin: left center;
        }

        .cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--ember);
          color: #fff;
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 14px 32px;
          border-radius: 4px;
          white-space: nowrap;
          transition: background 0.15s, transform 0.15s;
          text-decoration: none;
          animation: pulseGlow 3s ease-in-out 1.5s infinite;
        }
        .cta-primary:hover { background: var(--ember-dim); transform: translateY(-1px); }

        .cta-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          color: var(--text);
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 14px 28px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.14);
          transition: border-color 0.15s, color 0.15s;
          text-decoration: none;
        }
        .cta-ghost:hover { border-color: rgba(255,255,255,0.35); color: #fff; }

        .feature-card {
          background: var(--surface2);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          padding: 2rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .feature-card:hover {
          border-color: rgba(232,86,10,0.3);
          transform: translateY(-3px);
        }

        .nav-link {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          transition: color 0.15s;
          text-decoration: none;
        }
        .nav-link:hover { color: var(--text); }

        .section-label {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ember);
        }

        .step-num {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 800;
          font-style: italic;
          font-size: 5rem;
          line-height: 1;
          color: var(--border-subtle);
          letter-spacing: -0.02em;
          user-select: none;
        }

        .os-card {
          border-radius: 12px;
          padding: 2rem;
          border: 1px solid;
          transition: border-color 0.2s;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          align-items: center;
        }
        .hero-app-col { display: none; }
        @media (min-width: 900px) {
          .hero-grid { grid-template-columns: 1fr 1fr; }
          .hero-app-col { display: block; }
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }
      `}</style>

      <div
        className={`${barlow.variable} ${serif.variable} lp`}
        style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}
      >
        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(7,8,13,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 2rem',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <Image src="/logo.png" alt="18th Man" width={36} height={36} style={{ flexShrink: 0 }} />
              <span
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.04em', color: 'var(--text)' }}
              >
                18TH MAN
              </span>
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link href="/" className="nav-link" style={{ display: 'none' }}>
                ← Back to 18th Man
              </Link>
              {canDownload ? (
                <a
                  href={DOWNLOAD_WIN}
                  className="cta-primary"
                  style={{ fontSize: '0.8rem', padding: '10px 20px', animation: 'none' }}
                >
                  Download for Windows
                </a>
              ) : (
                <Link
                  href={user ? '/pricing' : '/login?next=/analyst'}
                  className="cta-primary"
                  style={{ fontSize: '0.8rem', padding: '10px 20px', animation: 'none' }}
                >
                  {user ? 'Upgrade to Download' : 'Sign In to Download'}
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section
          style={{
            position: 'relative',
            minHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem) 4rem',
          }}
        >
          {/* Ember glow */}
          <div
            style={{
              position: 'absolute',
              top: '-200px',
              right: '-150px',
              width: '600px',
              height: '600px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,86,10,0.12) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
            <div className="hero-grid">

              {/* ── Left: text ── */}
              <div>
                <div className="reveal-0" style={{ marginBottom: '1.5rem' }}>
                  <span className="section-label">Members Only · Desktop App</span>
                  <span className="ember-line" style={{ width: '48px', marginTop: '8px' }} />
                </div>

                <h1
                  className="lp-display reveal-1"
                  style={{
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.6rem, 8vw, 6rem)',
                    lineHeight: 0.92,
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                    marginBottom: '0.15em',
                  }}
                >
                  <span style={{ display: 'block', color: 'var(--text)' }}>Match</span>
                  <span style={{ display: 'block', color: 'var(--ember)' }}>Analyst.</span>
                </h1>

                <p
                  className="reveal-2"
                  style={{
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    lineHeight: 1.65,
                    color: 'var(--text-muted)',
                    maxWidth: '480px',
                    marginTop: '2rem',
                    marginBottom: '1.25rem',
                    fontWeight: 300,
                  }}
                >
                  Tag player stats against match video, export highlight clips, and generate
                  PDF match reports. Built for rugby league coaches — runs entirely on your computer.
                </p>

                {/* Membership requirement notice — always visible */}
                <div
                  className="reveal-2"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: canDownload ? 'rgba(74,222,128,0.08)' : 'rgba(232,86,10,0.08)',
                    border: `1px solid ${canDownload ? 'rgba(74,222,128,0.2)' : 'rgba(232,86,10,0.25)'}`,
                    borderRadius: '8px',
                    padding: '10px 16px',
                    marginBottom: '1.75rem',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{canDownload ? '✓' : '🔒'}</span>
                  <span style={{ fontSize: '0.85rem', color: canDownload ? 'rgba(74,222,128,0.9)' : 'var(--text-muted)', lineHeight: 1.4 }}>
                    {canDownload
                      ? 'Your membership includes Match Analyst.'
                      : <><strong style={{ color: 'var(--text)' }}>Paid members only.</strong> Requires an active Coach Pro or Club subscription.</>}
                  </span>
                </div>

                <div className="reveal-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                  {canDownload ? (
                    <a href={DOWNLOAD_WIN} className="cta-primary">
                      ↓ Download for Windows
                    </a>
                  ) : (
                    <Link href={user ? '/pricing' : '/signup?next=/analyst'} className="cta-primary">
                      {user ? 'Upgrade to Access' : 'Sign Up to Access'}
                    </Link>
                  )}
                  {!canDownload && !user && (
                    <Link href="/login?next=/analyst" className="cta-ghost">
                      Already a member? Sign in
                    </Link>
                  )}
                  {canDownload && (
                    <Link href="/" className="cta-ghost">
                      Back to 18th Man
                    </Link>
                  )}
                </div>

                <p
                  className="reveal-4"
                  style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}
                >
                  {canDownload
                    ? `Version ${APP_VERSION} · Windows 10 / 11 · 64-bit`
                    : user
                      ? 'Upgrade to Coach Pro or Club to unlock'
                      : 'Available on Coach Pro (£9.99/mo) and Club (£24.99/mo) plans'}
                </p>

                <div
                  className="reveal-4"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2rem',
                    marginTop: '4rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  {[
                    { num: 'Free', label: 'to download' },
                    { num: 'Offline', label: 'no internet needed' },
                    { num: 'ffmpeg', label: 'clip export built in' },
                    { num: 'PDF', label: 'match reports' },
                  ].map(({ num, label }) => (
                    <div key={label}>
                      <div
                        className="lp-display"
                        style={{ fontSize: '1.8rem', fontWeight: 800, fontStyle: 'italic', color: 'var(--ember)', lineHeight: 1 }}
                      >
                        {num}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.05em' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: app UI mock ── */}
              <div className="hero-app-col reveal-fade">
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', top: '-14px', right: '20px', zIndex: 2,
                    background: 'var(--ember)', color: '#fff',
                    fontFamily: 'var(--font-barlow)', fontWeight: 700,
                    fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(232,86,10,0.45)',
                  }}>
                    Match Analyst v{APP_VERSION}
                  </div>

                  <div style={{
                    background: 'var(--surface2)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,86,10,0.08)',
                  }}>
                    {/* Window chrome */}
                    <div style={{
                      height: '42px',
                      background: 'rgba(0,0,0,0.45)',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '6px',
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ marginLeft: '8px', fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Round 12 — Dragons vs Bulldogs
                      </span>
                    </div>

                    {/* App content mock */}
                    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {/* Video bar */}
                      <div style={{
                        height: '8px',
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: '4px',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '42%', background: 'var(--ember)', borderRadius: '4px' }} />
                        <div style={{ position: 'absolute', left: '42%', top: '-2px', width: '10px', height: '12px', background: '#fff', borderRadius: '2px', transform: 'translateX(-50%)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.08em' }}>
                        <span>32:14</span><span>76:00</span>
                      </div>

                      {/* Stat event rows */}
                      {[
                        { time: '28:42', player: '#7 Mitchell', stat: 'Tackle Break', color: 'var(--ember)' },
                        { time: '31:05', player: '#1 Harris', stat: 'Try', color: '#22c55e' },
                        { time: '32:14', player: '#9 Evans', stat: 'Dummy Half Run', color: 'rgba(232,86,10,0.6)' },
                      ].map((row) => (
                        <div key={row.time} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '8px 12px',
                        }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.08em', flexShrink: 0, minWidth: '38px' }}>
                            {row.time}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flex: 1 }}>{row.player}</span>
                          <span style={{ fontSize: '0.68rem', color: row.color, fontFamily: 'var(--font-barlow)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {row.stat}
                          </span>
                        </div>
                      ))}

                      {/* Stats summary bar */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        marginTop: '4px',
                      }}>
                        {[
                          { val: '14', lbl: 'Carries' },
                          { val: '3', lbl: 'Breaks' },
                          { val: '28', lbl: 'Tackles' },
                          { val: '2', lbl: 'Tries' },
                        ].map(({ val, lbl }) => (
                          <div key={lbl} style={{
                            background: 'rgba(232,86,10,0.08)',
                            border: '1px solid rgba(232,86,10,0.15)',
                            borderRadius: '6px',
                            padding: '8px',
                            textAlign: 'center',
                          }}>
                            <div className="lp-display" style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--ember)', lineHeight: 1 }}>{val}</div>
                            <div style={{ fontSize: '0.58rem', color: 'var(--text-dim)', marginTop: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{lbl}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── FEATURES ────────────────────────────────────────────── */}
        <section
          style={{
            padding: '7rem 2rem',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '4rem' }}>
              <span className="section-label">What It Does</span>
              <h2
                className="lp-display"
                style={{
                  fontWeight: 800,
                  fontStyle: 'italic',
                  fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                  lineHeight: 0.95,
                  textTransform: 'uppercase',
                  color: 'var(--text)',
                  marginTop: '1rem',
                  maxWidth: '600px',
                }}
              >
                Video analysis<br />
                <span style={{ color: 'var(--ember)' }}>built for coaches.</span>
              </h2>
            </div>

            <div className="features-grid">
              <div className="feature-card" style={{ borderColor: 'rgba(232,86,10,0.2)', background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.05) 100%)' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(232,86,10,0.15)', border: '1px solid rgba(232,86,10,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}>
                  🎬
                </div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Video Tagging
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                  Load any match video from your computer and tag player stats in real time.
                  Every event is timestamped automatically — carries, tackles, breaks, tries, errors, and more.
                </p>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {['Tag events with a single click', 'Custom stat categories per match', 'Auto-timestamp on each tag', 'Works with any video format'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="feature-card">
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(232,86,10,0.12)', border: '1px solid rgba(232,86,10,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}>
                  ✂️
                </div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Clip Export
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                  Select any tagged event and export the surrounding footage as a clip. Built-in
                  ffmpeg means no external software — just click and export to an MP4.
                </p>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {['Export individual clips or bulk batches', 'Adjustable clip duration', 'Output to any folder', 'No extra software to install'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="feature-card">
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}>
                  📊
                </div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Match Reports
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                  Generate a full PDF match report from your session with one click.
                  Player stat totals, event timelines, and carry meterage — ready to share with your squad.
                </p>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {['PDF and CSV export', 'Per-player stat breakdown', 'Carry meterage tracking', 'One-click report generation'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'rgba(99,102,241,0.8)', fontWeight: 700 }}>→</span> {f}
                    </div>
                  ))}
                </div>
              </div>

              <div className="feature-card">
                <div style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}>
                  💾
                </div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Session Library
                </h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                  Every match session is saved locally on your machine. Resume a session at any point,
                  compare stats across rounds, and build a full-season library of match data.
                </p>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  {['Auto-saves as you tag', 'Resume any previous session', 'All data stored locally', 'No cloud account needed'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'rgba(74,222,128,0.7)', fontWeight: 700 }}>→</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────── */}
        <section style={{ padding: '7rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '4rem' }}>
            <span className="section-label">Getting Started</span>
            <h2
              className="lp-display"
              style={{
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginTop: '1rem',
              }}
            >
              Up and analysing<br />
              <span style={{ color: 'var(--ember)' }}>in minutes.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '3rem' }}>
            {[
              {
                n: '01',
                title: 'Download & Install',
                body: 'Download the installer for Windows, run it, and the app is ready. No account, no internet connection, no setup steps — just open it.',
              },
              {
                n: '02',
                title: 'Load Your Match Video',
                body: 'Select the match video file from your computer. The app streams it directly — no importing or copying required.',
              },
              {
                n: '03',
                title: 'Tag Events Live',
                body: 'Watch the footage and click the stat buttons to tag events. Each tag is timestamped instantly. Add player names and event types as you go.',
              },
              {
                n: '04',
                title: 'Export & Report',
                body: 'When you\'re done, export clips of any tagged moment, then generate a full PDF match report to share with your coaching staff.',
              },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <div className="step-num">{n}</div>
                <h3
                  className="lp-display"
                  style={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: 'var(--text)',
                    marginBottom: '0.75rem',
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DOWNLOAD ────────────────────────────────────────────── */}
        <section
          style={{
            padding: '7rem 2rem',
            background: 'linear-gradient(180deg, var(--bg) 0%, #100a06 30%, #100a06 70%, var(--bg) 100%)',
            borderTop: '2px solid rgba(232,86,10,0.25)',
            borderBottom: '2px solid rgba(232,86,10,0.25)',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(232,86,10,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', textAlign: 'center' }}>
            <span className="section-label">Members Download</span>
            <h2
              className="lp-display"
              style={{
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 0.95,
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginTop: '1rem',
                marginBottom: '1rem',
              }}
            >
              Get Match Analyst<br />
              <span style={{ color: 'var(--ember)' }}>with your plan.</span>
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300, marginBottom: '2.5rem' }}>
              Included with Coach Pro and Club subscriptions. Sign up or upgrade to download.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>

              {/* Windows */}
              <div
                className="os-card"
                style={{
                  borderColor: 'rgba(232,86,10,0.35)',
                  background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.06) 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'rgba(232,86,10,0.15)', border: '1px solid rgba(232,86,10,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>
                    🪟
                  </div>
                  <div>
                    <div className="lp-display" style={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Windows</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Windows 10 / 11 · 64-bit</div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  {['NSIS installer (.exe)', 'Runs on Windows 10 / 11', 'ffmpeg bundled — no extras needed', 'No internet required after install'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--ember)', fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                {canDownload ? (
                  <a href={DOWNLOAD_WIN} className="cta-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    ↓ Download v{APP_VERSION}
                  </a>
                ) : (
                  <Link href={user ? '/pricing' : '/login?next=/analyst'} className="cta-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    🔒 {user ? 'Upgrade to Download' : 'Sign In to Download'}
                  </Link>
                )}
                <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                  {canDownload ? 'Free · No account needed' : user ? 'Club members & Coach Pro subscribers' : 'Sign in required'}
                </p>
              </div>

              {/* Mac */}
              <div
                className="os-card"
                style={{
                  borderColor: 'rgba(255,255,255,0.1)',
                  background: 'var(--surface2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
                  }}>
                    🍎
                  </div>
                  <div>
                    <div className="lp-display" style={{ fontWeight: 800, fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>macOS</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Apple Silicon & Intel</div>
                  </div>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  {['Universal .dmg installer', 'Runs on Apple Silicon (M1–M4)', 'Runs on Intel Macs', 'ffmpeg bundled — no extras needed'].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
                {canDownload ? (
                  <a href={DOWNLOAD_MAC} className="cta-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    ↓ Download v{APP_VERSION}
                  </a>
                ) : (
                  <Link href={user ? '/pricing' : '/login?next=/analyst'} className="cta-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                    🔒 {user ? 'Upgrade to Download' : 'Sign In to Download'}
                  </Link>
                )}
                <p style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                  {canDownload ? 'Free · No account needed' : user ? 'Club members & Coach Pro subscribers' : 'Sign in required'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── REQUIREMENTS ────────────────────────────────────────── */}
        <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '3rem' }}>
            <span className="section-label">System Requirements</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {[
              { icon: '💻', label: 'Operating System', value: 'Windows 10 or 11 (64-bit)' },
              { icon: '🧠', label: 'Memory', value: '4 GB RAM recommended' },
              { icon: '💿', label: 'Storage', value: '200 MB for the app + space for video files' },
              { icon: '🎥', label: 'Video Files', value: 'Any format supported by ffmpeg (MP4, MOV, MKV, AVI…)' },
            ].map(({ icon, label, value }) => (
              <div
                key={label}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '1.5rem',
                }}
              >
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{icon}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ember)', fontFamily: 'var(--font-barlow)', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.5 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER CTA ──────────────────────────────────────────── */}
        <section
          style={{
            padding: '5rem 2rem',
            textAlign: 'center',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <span className="section-label">{canDownload ? 'Ready to Download' : 'Members Only'}</span>
            <h2
              className="lp-display"
              style={{
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                lineHeight: 0.95,
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginTop: '1rem',
                marginBottom: '1rem',
              }}
            >
              {canDownload ? (
                <>Start analysing<br /><span style={{ color: 'var(--ember)' }}>today.</span></>
              ) : (
                <>Unlock Match<br /><span style={{ color: 'var(--ember)' }}>Analyst.</span></>
              )}
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.7, marginBottom: '2rem' }}>
              {canDownload
                ? 'Download below. Runs entirely on your computer — no internet required after install.'
                : user
                  ? 'Match Analyst is included with Coach Pro (£9.99/mo) and Club (£24.99/mo) plans. Upgrade your account to download.'
                  : 'Match Analyst is included with paid 18th Man memberships. Sign up or upgrade to Coach Pro or Club to download.'}
            </p>
            {canDownload ? (
              <a href={DOWNLOAD_WIN} className="cta-primary" style={{ fontSize: '1rem', padding: '16px 40px' }}>
                ↓ Download for Windows
              </a>
            ) : (
              <Link href={user ? '/pricing' : '/signup?next=/analyst'} className="cta-primary" style={{ fontSize: '1rem', padding: '16px 40px' }}>
                {user ? 'Upgrade My Account' : 'Sign Up to Get Access'}
              </Link>
            )}
            <p style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {canDownload
                ? `Version ${APP_VERSION} · Windows 10 / 11 · 64-bit`
                : user
                  ? 'Coach Pro from £9.99/mo · Club from £24.99/mo · Cancel anytime'
                  : 'Already a member? Sign in above · Coach Pro from £9.99/mo'}
            </p>
            {!canDownload && !user && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Already have an account?{' '}
                <Link href="/login?next=/analyst" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Sign in →</Link>
              </p>
            )}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {canDownload ? 'Want the full coaching platform?' : 'See what else is included with membership.'}
              </p>
              <Link href={canDownload ? '/' : '/pricing'} className="cta-ghost">
                {canDownload ? 'Explore 18th Man →' : 'View Plans & Pricing →'}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
