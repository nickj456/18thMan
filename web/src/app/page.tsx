import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Barlow_Condensed, Source_Serif_4 } from 'next/font/google'

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
  title: '18th Man — The Coaching Platform for Rugby League',
  description:
    'Design drills on a digital canvas, plan training sessions, get instant AI coaching advice, and share knowledge with a community of rugby league coaches.',
}

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes lineGrow {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
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

        .marquee-track {
          display: flex;
          animation: marquee 28s linear infinite;
          width: max-content;
        }
        .marquee-track:hover { animation-play-state: paused; }

        .hero-pitch {
          position: absolute;
          inset: 0;
          opacity: 0.028;
          pointer-events: none;
        }

        .ember-line {
          display: block;
          height: 2px;
          background: var(--ember);
          transform-origin: left center;
          animation: lineGrow 1s cubic-bezier(.22,.6,.36,1) 0.6s both;
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

        .stat-pill {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 800;
          font-style: italic;
          color: var(--text-muted);
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          white-space: nowrap;
          padding: 0 2.5rem;
        }
        .stat-pill span {
          color: var(--ember);
          margin-right: 0.5rem;
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

        .nav-link {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 600;
          font-size: 0.85rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          transition: color 0.15s;
        }
        .nav-link:hover { color: var(--text); }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }
        @media (max-width: 639px) {
          .nav-links { display: none; }
        }

        .section-label {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--ember);
        }

        .gradient-fade-b {
          background: linear-gradient(to bottom, transparent, var(--bg) 90%);
        }
        .gradient-fade-t {
          background: linear-gradient(to top, transparent, var(--bg) 90%);
        }

        .quote-mark {
          font-family: var(--font-barlow), system-ui, sans-serif;
          font-weight: 800;
          font-size: 8rem;
          line-height: 0.8;
          color: var(--ember);
          opacity: 0.12;
          user-select: none;
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
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <Image src="/logo.png" alt="18th Man" width={36} height={36} style={{ flexShrink: 0 }} />
              <span
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.04em', color: 'var(--text)' }}
              >
                18TH MAN
              </span>
            </Link>

            {/* Nav links (hidden on mobile) */}
            <div className="nav-links">
              <a href="#features" className="nav-link" style={{ textDecoration: 'none' }}>Features</a>
              <a href="#how-it-works" className="nav-link" style={{ textDecoration: 'none' }}>How It Works</a>
              <a href="#community" className="nav-link" style={{ textDecoration: 'none' }}>Community</a>
            </div>

            {/* Auth CTA */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user ? (
                <Link href="/dashboard" className="cta-primary" style={{ fontSize: '0.8rem', padding: '10px 20px' }}>
                  Go to App →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="nav-link hidden sm:block" style={{ textDecoration: 'none' }}>
                    Sign In
                  </Link>
                  <Link href="/signup" className="cta-primary" style={{ fontSize: '0.8rem', padding: '10px 20px' }}>
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section
          style={{
            position: 'relative',
            minHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem) 4rem',
          }}
        >
          {/* Pitch grid background SVG */}
          <svg
            className="hero-pitch"
            viewBox="0 0 680 1000"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Pitch outline */}
            <rect x="20" y="20" width="640" height="960" stroke="white" strokeWidth="2" />
            {/* In-goal areas */}
            <line x1="20" y1="100" x2="660" y2="100" stroke="white" strokeWidth="1.5" />
            <line x1="20" y1="900" x2="660" y2="900" stroke="white" strokeWidth="1.5" />
            {/* 10m lines from each try line */}
            <line x1="20" y1="196" x2="660" y2="196" stroke="white" strokeWidth="1" />
            <line x1="20" y1="804" x2="660" y2="804" stroke="white" strokeWidth="1" />
            {/* 20m lines */}
            <line x1="20" y1="292" x2="660" y2="292" stroke="white" strokeWidth="1" />
            <line x1="20" y1="708" x2="660" y2="708" stroke="white" strokeWidth="1" />
            {/* 40m lines */}
            <line x1="20" y1="404" x2="660" y2="404" stroke="white" strokeWidth="1" />
            <line x1="20" y1="596" x2="660" y2="596" stroke="white" strokeWidth="1" />
            {/* Halfway */}
            <line x1="20" y1="500" x2="660" y2="500" stroke="white" strokeWidth="1.5" />
            {/* Centre spot */}
            <circle cx="340" cy="500" r="4" fill="white" />
            {/* Touchline markers - left */}
            {[100, 196, 292, 404, 500, 596, 708, 804, 900].map(y => (
              <line key={`l${y}`} x1="20" y1={y} x2="44" y2={y} stroke="white" strokeWidth="1" />
            ))}
            {/* Touchline markers - right */}
            {[100, 196, 292, 404, 500, 596, 708, 804, 900].map(y => (
              <line key={`r${y}`} x1="660" y1={y} x2="636" y2={y} stroke="white" strokeWidth="1" />
            ))}
            {/* Goalposts top */}
            <line x1="310" y1="20" x2="310" y2="70" stroke="white" strokeWidth="2" />
            <line x1="370" y1="20" x2="370" y2="70" stroke="white" strokeWidth="2" />
            <line x1="310" y1="48" x2="370" y2="48" stroke="white" strokeWidth="2" />
            <line x1="340" y1="48" x2="340" y2="100" stroke="white" strokeWidth="1.5" />
            {/* Goalposts bottom */}
            <line x1="310" y1="980" x2="310" y2="930" stroke="white" strokeWidth="2" />
            <line x1="370" y1="980" x2="370" y2="930" stroke="white" strokeWidth="2" />
            <line x1="310" y1="952" x2="370" y2="952" stroke="white" strokeWidth="2" />
            <line x1="340" y1="952" x2="340" y2="900" stroke="white" strokeWidth="1.5" />
          </svg>

          {/* Ember glow top-right */}
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
          {/* Subtle bottom glow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              left: '10%',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 65%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
            {/* Section label */}
            <div className="reveal-0" style={{ marginBottom: '1.5rem' }}>
              <span className="section-label">Rugby League Coaching Platform</span>
              <span className="ember-line" style={{ display: 'block', width: '48px', marginTop: '8px' }} />
            </div>

            {/* Main headline */}
            <h1
              className="lp-display reveal-1"
              style={{
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: 'clamp(2.6rem, 11vw, 10rem)',
                lineHeight: 0.92,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                marginBottom: '0.15em',
              }}
            >
              <span style={{ display: 'block', color: 'var(--ember)' }}>Elevate</span>
              <span style={{ display: 'block', color: 'var(--text)' }}>Your Coaching.</span>
            </h1>

            {/* Sub-headline */}
            <p
              className="reveal-2"
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.3rem)',
                lineHeight: 1.65,
                color: 'var(--text-muted)',
                maxWidth: '540px',
                marginTop: '2rem',
                marginBottom: '2.5rem',
                fontWeight: 300,
              }}
            >
              18th Man gives rugby league coaches the tools to design better drills,
              plan more effective sessions, and share knowledge that lifts the entire
              game. Backed by AI. Built for the coaching room.
            </p>

            {/* CTAs */}
            <div className="reveal-3" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <Link href={user ? '/dashboard' : '/signup'} className="cta-primary">
                {user ? 'Go to Dashboard' : 'Start Coaching Better'} →
              </Link>
              {!user && (
                <Link href="/login" className="cta-ghost">
                  Sign In
                </Link>
              )}
            </div>

            {/* Trust indicators */}
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
                { num: 'Free', label: 'to join' },
                { num: 'AI', label: 'coaching assistant' },
                { num: '∞', label: 'drills to share' },
              ].map(({ num, label }) => (
                <div key={label}>
                  <div
                    className="lp-display"
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      fontStyle: 'italic',
                      color: 'var(--ember)',
                      lineHeight: 1,
                    }}
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
        </section>

        {/* ── MARQUEE STRIP ───────────────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface)',
            padding: '1rem 0',
            overflow: 'hidden',
          }}
        >
          <div className="marquee-track">
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                {[
                  '🏉 Design drills on a digital canvas',
                  '⚡ AI coaching assistant, instant advice',
                  '📋 Build and share session plans',
                  '👥 Connect with a coaching community',
                  '🎯 Improve player development',
                  '📊 Track drills, sessions, and progress',
                ].map(item => (
                  <span key={item} className="stat-pill">
                    <span>·</span> {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURES ────────────────────────────────────────────── */}
        <section id="features" style={{ padding: '7rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: '4rem' }}>
            <span className="section-label">What 18th Man Gives You</span>
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
              Every tool a<br />
              <span style={{ color: 'var(--ember)' }}>serious coach</span><br />
              needs.
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Feature 1 — Drill Designer */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'rgba(232,86,10,0.12)',
                  border: '1px solid rgba(232,86,10,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  marginBottom: '1.5rem',
                }}
              >
                ✏️
              </div>
              <h3
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}
              >
                Drill Designer
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Draw your drills on a digital canvas exactly as you would on a whiteboard — add players,
                cones, movement arrows, and zones. Save, share, and build your library of go-to sessions.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['Player markers & formations', 'Movement arrows & zones', 'Preview images & video links', 'AI coaching guide generation'].map(f => (
                  <div
                    key={f}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                  >
                    <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2 — AI Coach */}
            <div className="feature-card" style={{ borderColor: 'rgba(232,86,10,0.15)', background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.04) 100%)' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'rgba(232,86,10,0.15)',
                  border: '1px solid rgba(232,86,10,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  marginBottom: '1.5rem',
                }}
              >
                ⚡
              </div>
              <h3
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}
              >
                AI Coaching Assistant
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Ask anything. Get instant, structured advice on drills, tactics, player development,
                and session planning from an AI that understands rugby league coaching.
              </p>
              {/* Chat example */}
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px', fontFamily: 'var(--font-barlow)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Example Prompt
                </div>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "Give me a 15-minute defensive line speed drill for U16s that I can run with limited space..."
                </p>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--ember)' }}>
                  → Structured drill with setup, coaching points & progressions
                </div>
              </div>
            </div>

            {/* Feature 3 — Session Planner */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '10px',
                  background: 'rgba(74,222,128,0.08)',
                  border: '1px solid rgba(74,222,128,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  marginBottom: '1.5rem',
                }}
              >
                📋
              </div>
              <h3
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}
              >
                Session Planner
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Build structured training sessions by sequencing drills from your library.
                Set durations, track total time, and export a clean PDF for the training ground.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['Drag-and-drop drill ordering', 'Auto-calculated session duration', 'PDF export for print', 'Reuse across multiple sessions'].map(f => (
                  <div
                    key={f}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
                  >
                    <span style={{ color: 'rgba(74,222,128,0.7)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────── */}
        <section
          id="how-it-works"
          style={{
            padding: '7rem 2rem',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                Up and coaching<br />
                <span style={{ color: 'var(--ember)' }}>in minutes.</span>
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '3rem',
              }}
            >
              {[
                {
                  n: '01',
                  title: 'Create Your Account',
                  body: 'Sign up free. Set your coaching profile, add your club, and tell us about your experience level. It takes two minutes.',
                },
                {
                  n: '02',
                  title: 'Design Your First Drill',
                  body: 'Use the visual canvas to map out a drill exactly how you see it in your head. Add player positions, movement arrows, cones, and zones.',
                },
                {
                  n: '03',
                  title: 'Build Your Session',
                  body: 'Sequence your drills into a full training session with timing. Export to PDF, or share directly with your coaching staff.',
                },
                {
                  n: '04',
                  title: 'Share & Learn',
                  body: 'Publish drills to the community library. Discover what coaches across the game are running. Rate, comment, and improve together.',
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
          </div>
        </section>

        {/* ── AI DEEP DIVE ────────────────────────────────────────── */}
        <section style={{ padding: '7rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '4rem',
              alignItems: 'center',
            }}
          >
            <div>
              <span className="section-label">AI-Powered</span>
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
                  marginBottom: '1.5rem',
                }}
              >
                Your coaching<br />
                knowledge,<br />
                <span style={{ color: 'var(--ember)' }}>amplified.</span>
              </h2>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: 'var(--text-muted)', fontWeight: 300, marginBottom: '1.5rem' }}>
                The AI Coaching Assistant isn't a generic chatbot. It's built around the language
                of rugby league — drills, sets, tackles, defensive structures, positional play,
                and player development. Ask a coaching question, get a coaching answer.
              </p>
              <p style={{ fontSize: '1rem', lineHeight: 1.75, color: 'var(--text-muted)', fontWeight: 300 }}>
                Every drill you create automatically receives an AI-generated coaching guide —
                key points, common errors, progressions, and warm-up suggestions — so your
                whole squad understands the intent, not just the movement.
              </p>
            </div>

            {/* AI preview card */}
            <div
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '1rem 1.25rem',
                  background: 'rgba(232,86,10,0.06)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  AI Coach Chat
                </span>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* User message */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div
                    style={{
                      background: 'var(--ember)',
                      borderRadius: '12px 12px 2px 12px',
                      padding: '10px 14px',
                      maxWidth: '80%',
                      fontSize: '0.85rem',
                      color: '#fff',
                      lineHeight: 1.5,
                    }}
                  >
                    What's a good drill to improve line speed in defence for an U18 side?
                  </div>
                </div>
                {/* AI response */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(232,86,10,0.15)',
                      border: '1px solid rgba(232,86,10,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.75rem',
                    }}
                  >
                    ⚡
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '2px 12px 12px 12px',
                      padding: '12px 14px',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}>
                      Defensive Line Speed Drill — "Blitz & Shuffle"
                    </div>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--ember)' }}>Setup:</strong> 6 attackers in a flat line, 6 defenders 5m back. Cones mark the D-line start position.</div>
                    <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--ember)' }}>Key Coaching Points:</strong> Push off the back foot, shoulders square, communicate early...</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '8px' }}>→ Full drill with progressions generated below</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMMUNITY ───────────────────────────────────────────── */}
        <section
          id="community"
          style={{
            padding: '7rem 2rem',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background ember glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '800px',
              height: '400px',
              background: 'radial-gradient(ellipse, rgba(232,86,10,0.05) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '4rem',
                alignItems: 'center',
              }}
            >
              {/* Stats */}
              <div>
                <div className="quote-mark">"</div>
                <p
                  style={{
                    fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                    lineHeight: 1.65,
                    color: 'var(--text)',
                    fontWeight: 300,
                    marginBottom: '2rem',
                    fontStyle: 'italic',
                  }}
                >
                  The best coaches in rugby league have always shared knowledge freely.
                  18th Man is the digital home for that tradition — where your best session
                  plan can help a coach three clubs away run a better training night.
                </p>
                <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
                  {[
                    { value: 'Open', label: 'Drill Library' },
                    { value: 'Free', label: 'Community Board' },
                    { value: 'Yours', label: 'Session Plans' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <div
                        className="lp-display"
                        style={{
                          fontWeight: 800,
                          fontStyle: 'italic',
                          fontSize: '2rem',
                          color: 'var(--ember)',
                          lineHeight: 1,
                        }}
                      >
                        {value}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.06em' }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community pitch */}
              <div>
                <span className="section-label">Community Board</span>
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
                    marginBottom: '1.5rem',
                  }}
                >
                  The whole game<br />
                  gets <span style={{ color: 'var(--ember)' }}>better</span><br />
                  together.
                </h2>
                <p style={{ fontSize: '1rem', lineHeight: 1.75, color: 'var(--text-muted)', fontWeight: 300 }}>
                  A dedicated space for rugby league coaches to discuss tactics, share
                  discoveries, ask questions, and debate what works at every level of the game —
                  from grassroots through to elite.
                </p>
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    '📌 Pinned discussions on key coaching topics',
                    '💬 Rate and review drills with real coaching feedback',
                    '🔍 Discover what other coaches are running this week',
                    '🏆 Build a reputation as a knowledge-sharing leader',
                  ].map(item => (
                    <div key={item} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────── */}
        <section
          style={{
            padding: '8rem 2rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(232,86,10,0.1) 0%, transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
            <span className="section-label">Join the Platform</span>
            <h2
              className="lp-display"
              style={{
                fontWeight: 800,
                fontStyle: 'italic',
                fontSize: 'clamp(3rem, 8vw, 6.5rem)',
                lineHeight: 0.9,
                textTransform: 'uppercase',
                color: 'var(--text)',
                marginTop: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              Ready to coach<br />
              <span style={{ color: 'var(--ember)' }}>smarter?</span>
            </h2>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300, marginBottom: '2.5rem' }}>
              Join coaches who are already designing better drills, planning smarter sessions,
              and building a community of shared knowledge. It's free to start.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <Link href={user ? '/dashboard' : '/signup'} className="cta-primary" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
                {user ? 'Go to Dashboard' : 'Create Free Account'} →
              </Link>
              {!user && (
                <Link href="/drills" className="cta-ghost" style={{ fontSize: '1.1rem', padding: '16px 36px' }}>
                  Browse Drill Library
                </Link>
              )}
            </div>
            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              No credit card required · Free to join · Built for rugby league coaches
            </p>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--surface)',
            padding: '3rem 2rem',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1.5rem',
            }}
          >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Image src="/logo.png" alt="18th Man" width={30} height={30} style={{ flexShrink: 0 }} />
              <span
                className="lp-display"
                style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.06em', color: 'var(--text-muted)' }}
              >
                18TH MAN
              </span>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Drill Library', href: '/drills' },
                { label: 'Community', href: '/chat/community' },
                { label: 'Sign In', href: '/login' },
                { label: 'Get Started', href: '/signup' },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  style={{
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    color: 'var(--text-dim)',
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'color 0.15s',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              © {new Date().getFullYear()} 18th Man. Built for rugby league coaches.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}
