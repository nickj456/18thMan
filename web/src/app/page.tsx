import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Barlow_Condensed, Source_Serif_4 } from 'next/font/google'
import { DownloadForm } from '@/components/landing/DownloadForm'
import { ExitIntentPopup } from '@/components/landing/ExitIntentPopup'

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
          opacity: 0.055;
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
          font-weight: 700;
          font-style: italic;
          color: #9a9590;
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

        .hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 3rem;
          align-items: center;
        }
        .hero-canvas-col { display: none; }

        @media (min-width: 900px) {
          .hero-grid { grid-template-columns: 1fr 1fr; }
          .hero-canvas-col { display: block; }
        }

        .services-section { padding: 7rem 2rem; }
        .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr)); gap: 2rem; align-items: stretch; }
        .service-card-title { font-size: 1.5rem; }
        .service-price { font-size: 2rem; }
        .service-desc-text { display: block; }
        .services-intro-text { display: block; }
        .services-intro-header { margin-bottom: 4rem; }
        .service-cta { font-size: 0.9rem; padding: 12px 20px; }

        @media (max-width: 639px) {
          .services-section { padding: 3.5rem 1rem; }
          .services-grid { grid-template-columns: 1fr; gap: 1.25rem; }
          .feature-card { padding: 1.5rem 1.25rem; }
          .service-card-title { font-size: 1.35rem; }
          .service-price { font-size: 2.75rem; }
          .service-desc-text { display: none; }
          .services-intro-text { display: none; }
          .services-intro-header { margin-bottom: 2rem; }
          .service-cta { font-size: 1.05rem !important; padding: 16px 20px !important; }
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
              <a href="#pricing" className="nav-link" style={{ textDecoration: 'none' }}>Pricing</a>
              <a href="#services" className="nav-link" style={{ textDecoration: 'none' }}>Services</a>
              <Link href="/analyst" className="nav-link" style={{ textDecoration: 'none' }}>Analyst</Link>
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
            {/* Goalposts bottom */}
            <line x1="310" y1="980" x2="310" y2="930" stroke="white" strokeWidth="2" />
            <line x1="370" y1="980" x2="370" y2="930" stroke="white" strokeWidth="2" />
            <line x1="310" y1="952" x2="370" y2="952" stroke="white" strokeWidth="2" />
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
            <div className="hero-grid">

              {/* ── Left: text ── */}
              <div>
                <div className="reveal-0" style={{ marginBottom: '1.5rem' }}>
                  <span className="section-label">Rugby League Coaching Platform</span>
                  <span className="ember-line" style={{ display: 'block', width: '48px', marginTop: '8px' }} />
                </div>

                <h1
                  className="lp-display reveal-1"
                  style={{
                    fontWeight: 800,
                    fontStyle: 'italic',
                    fontSize: 'clamp(2.6rem, 8vw, 6.5rem)',
                    lineHeight: 0.92,
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase',
                    marginBottom: '0.15em',
                  }}
                >
                  <span style={{ display: 'block', color: 'var(--ember)' }}>Better sessions.</span>
                  <span style={{ display: 'block', color: 'var(--text)' }}>Better players.</span>
                </h1>

                <p
                  className="reveal-2"
                  style={{
                    fontSize: 'clamp(1rem, 2vw, 1.2rem)',
                    lineHeight: 1.65,
                    color: 'var(--text-muted)',
                    maxWidth: '460px',
                    marginTop: '2rem',
                    marginBottom: '2.5rem',
                    fontWeight: 300,
                  }}
                >
                  Stop winging it on the whiteboard. 18th Man gives rugby league coaches
                  ready-made drills, AI-planned session blocks, and a community sharing
                  what actually works at training.
                </p>

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
                <p
                  className="reveal-4"
                  style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}
                >
                  Free to join · No credit card required · Set up in 2 minutes
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
                    { num: 'Free', label: 'to join' },
                    { num: 'AI', label: 'coaching assistant' },
                    { num: '∞', label: 'drills to share' },
                    { num: 'Club', label: 'team collaboration' },
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

              {/* ── Right: drill canvas mock ── */}
              <div className="hero-canvas-col reveal-fade">
                <div style={{ position: 'relative' }}>
                  {/* Floating label */}
                  <div style={{
                    position: 'absolute', top: '-14px', right: '20px', zIndex: 2,
                    background: 'var(--ember)', color: '#fff',
                    fontFamily: 'var(--font-barlow)', fontWeight: 700,
                    fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '5px 14px', borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(232,86,10,0.45)',
                  }}>
                    Drill Designer
                  </div>

                  {/* Card */}
                  <div style={{
                    background: 'var(--surface2)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(232,86,10,0.08)',
                  }}>
                    {/* Mac-style toolbar */}
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
                        Line Speed — Attack vs Defence
                      </span>
                    </div>

                    {/* Canvas */}
                    <div style={{ position: 'relative', background: '#0a2b14', overflow: 'hidden', aspectRatio: '4/3' }}>
                      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                        <defs>
                          <marker id="ao" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L8,3 z" fill="#e8560a" />
                          </marker>
                          <marker id="ad" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L7,3 z" fill="rgba(232,86,10,0.55)" />
                          </marker>
                        </defs>

                        {/* Pitch lines */}
                        <line x1="15" y1="0" x2="15" y2="300" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
                        <line x1="385" y1="0" x2="385" y2="300" stroke="white" strokeOpacity="0.12" strokeWidth="1" />
                        <line x1="15" y1="52" x2="385" y2="52" stroke="white" strokeOpacity="0.28" strokeWidth="1.5" />
                        <line x1="15" y1="128" x2="385" y2="128" stroke="white" strokeOpacity="0.07" strokeWidth="1" />
                        <line x1="15" y1="200" x2="385" y2="200" stroke="white" strokeOpacity="0.05" strokeWidth="1" />

                        {/* Attack zone highlight */}
                        <rect x="80" y="52" width="240" height="100" rx="2" fill="rgba(232,86,10,0.05)" stroke="rgba(232,86,10,0.15)" strokeWidth="1" strokeDasharray="4,3" />

                        {/* Defenders */}
                        <circle cx="105" cy="88" r="14" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" />
                        <text x="105" y="93" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>
                        <circle cx="200" cy="80" r="14" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" />
                        <text x="200" y="85" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>
                        <circle cx="295" cy="88" r="14" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5" />
                        <text x="295" y="93" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>

                        {/* Ball carrier (7) */}
                        <circle cx="200" cy="222" r="17" fill="rgba(232,86,10,0.22)" stroke="#e8560a" strokeWidth="2" />
                        <text x="200" y="227" textAnchor="middle" fill="#e8560a" fontSize="10" fontWeight="bold" fontFamily="system-ui">7</text>
                        {/* Support (6, 8) */}
                        <circle cx="132" cy="224" r="14" fill="rgba(232,86,10,0.12)" stroke="rgba(232,86,10,0.5)" strokeWidth="1.5" />
                        <text x="132" y="229" textAnchor="middle" fill="rgba(232,86,10,0.85)" fontSize="10" fontWeight="bold" fontFamily="system-ui">6</text>
                        <circle cx="268" cy="224" r="14" fill="rgba(232,86,10,0.12)" stroke="rgba(232,86,10,0.5)" strokeWidth="1.5" />
                        <text x="268" y="229" textAnchor="middle" fill="rgba(232,86,10,0.85)" fontSize="10" fontWeight="bold" fontFamily="system-ui">8</text>
                        {/* Wide (5, 2) */}
                        <circle cx="55" cy="226" r="12" fill="rgba(232,86,10,0.07)" stroke="rgba(232,86,10,0.38)" strokeWidth="1.5" />
                        <text x="55" y="231" textAnchor="middle" fill="rgba(232,86,10,0.7)" fontSize="10" fontFamily="system-ui">5</text>
                        <circle cx="345" cy="226" r="12" fill="rgba(232,86,10,0.07)" stroke="rgba(232,86,10,0.38)" strokeWidth="1.5" />
                        <text x="345" y="231" textAnchor="middle" fill="rgba(232,86,10,0.7)" fontSize="10" fontFamily="system-ui">2</text>

                        {/* Movement arrows */}
                        <line x1="200" y1="204" x2="200" y2="112" stroke="#e8560a" strokeWidth="2.5" markerEnd="url(#ao)" />
                        <line x1="132" y1="209" x2="158" y2="120" stroke="rgba(232,86,10,0.55)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#ad)" />
                        <line x1="268" y1="209" x2="242" y2="120" stroke="rgba(232,86,10,0.55)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#ad)" />
                        <path d="M55,213 Q42,162 78,112" stroke="rgba(232,86,10,0.3)" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
                        <path d="M345,213 Q358,162 322,112" stroke="rgba(232,86,10,0.3)" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />

                        {/* Cones */}
                        <polygon points="68,166 62,178 74,178" fill="#eab308" opacity="0.9" />
                        <polygon points="332,166 326,178 338,178" fill="#eab308" opacity="0.9" />

                        {/* Label band */}
                        <rect x="0" y="270" width="400" height="30" fill="rgba(0,0,0,0.35)" />
                        <text x="200" y="289" textAnchor="middle" fill="rgba(232,86,10,0.75)" fontSize="8" fontFamily="system-ui" fontWeight="600" letterSpacing="1.5">LINE SPEED DRILL — ATK vs DEF</text>
                      </svg>

                      {/* AI coaching points overlay */}
                      <div style={{
                        position: 'absolute', bottom: '40px', right: '10px',
                        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '8px', padding: '8px 12px', maxWidth: '155px',
                      }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--ember)', fontFamily: 'var(--font-barlow)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '5px' }}>
                          AI Coaching Points
                        </div>
                        {['Push off back foot', 'Shoulders square', 'Communicate early'].map((pt, i) => (
                          <div key={i} style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', marginBottom: '3px' }}>
                            <span style={{ color: 'var(--ember)', flexShrink: 0 }}>→</span> {pt}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom bar */}
                    <div style={{
                      height: '36px',
                      background: 'rgba(0,0,0,0.35)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem',
                    }}>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Session 3 — Attack Block
                      </span>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: '0.62rem', color: 'var(--ember)', fontFamily: 'var(--font-barlow)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        AI Guide ✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── MARQUEE STRIP ───────────────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid rgba(232,86,10,0.2)',
            borderBottom: '1px solid rgba(232,86,10,0.2)',
            background: 'rgba(10,8,6,1)',
            padding: '1rem 0',
            overflow: 'hidden',
          }}
        >
          <div className="marquee-track">
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                {[
                  '🏉 Design drills on a digital canvas',
                  '⚡ AI-planned coaching blocks, every session covered',
                  '📋 Build and share session plans',
                  '👥 Club groups with private content',
                  '🎯 Game Sense session structure built in',
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

        {/* ── FOUNDER QUOTE ───────────────────────────────────────── */}
        <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: 'clamp(2rem, 4vw, 3.5rem)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '2.5rem',
              alignItems: 'center',
            }}
          >
            {/* Quote */}
            <div style={{ position: 'relative' }}>
              <div className="quote-mark" style={{ position: 'absolute', top: '-1rem', left: '-0.5rem' }}>"</div>
              <p
                className="lp"
                style={{
                  fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                  lineHeight: 1.7,
                  color: 'var(--text)',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  position: 'relative',
                  zIndex: 1,
                  paddingTop: '1.5rem',
                }}
              >
                I built 18th Man because I was coaching at the grassroots level and
                couldn&apos;t find tools that spoke the language of rugby league. The
                drills, the sets, the defensive structures — everything coaches
                actually talk about on the training field.
              </p>
            </div>

            {/* Author */}
            <div
              style={{
                borderLeft: '2px solid rgba(232,86,10,0.3)',
                paddingLeft: '2rem',
              }}
            >
              <div
                className="lp-display"
                style={{
                  fontWeight: 800,
                  fontSize: '1.15rem',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  color: 'var(--text)',
                  marginBottom: '0.4rem',
                }}
              >
                Nick Johnson
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Youth Team Coach<br />
                Ex Pro Rugby League Player<br />
                Level 2 Rugby League Coach<br />
                20+ years in the game
              </div>
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  color: 'var(--ember)',
                  fontFamily: 'var(--font-barlow)',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Creator of 18th Man
              </div>
            </div>
          </div>
        </section>

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
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Feature 1 — Coaching Blocks */}
            <div className="feature-card" style={{ borderColor: 'rgba(232,86,10,0.2)', background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.05) 100%)' }}>
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(232,86,10,0.15)', border: '1px solid rgba(232,86,10,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}
              >
                🗓️
              </div>
              <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Coaching Blocks
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Name your block, choose how many sessions, and AI plans every single one upfront —
                balanced across Attack, Defence, Completions, and Skills. The whole season, sorted before it starts.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['AI-generated Game Sense session plans', 'Balanced focus area rotation', 'Swap sessions when the team struggles', 'Track progress across the block'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2 — AI Coach */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(232,86,10,0.12)', border: '1px solid rgba(232,86,10,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}
              >
                ⚡
              </div>
              <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                AI Coaching Assistant
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Ask anything. Get instant, structured advice on drills, tactics, player development,
                and session planning from an AI that understands rugby league coaching.
              </p>
              <div
                style={{
                  marginTop: '1.5rem', background: 'rgba(0,0,0,0.3)',
                  borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-subtle)',
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

            {/* Feature 3 — Drill Designer */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}
              >
                ✏️
              </div>
              <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Drill Designer
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Draw drills on a digital canvas exactly as you would on a whiteboard — players,
                cones, arrows, zones. Build your private library and share with the community.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['Player markers & formations', 'Movement arrows & zones', 'Video links & preview images', 'AI coaching guide per drill'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'rgba(99,102,241,0.8)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 4 — Club Groups */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}
              >
                👥
              </div>
              <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Club & Groups
              </h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                Create a club, invite your coaching staff into private groups, and collaborate on
                session plans. Share coaching blocks across the team so everyone is working from the same plan.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['Private club drill libraries', 'Coaching groups for your staff', 'Shared session planning', 'AI guidance per group'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'rgba(74,222,128,0.7)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 5 — Match Analyst */}
            <div className="feature-card">
              <div
                style={{
                  width: '48px', height: '48px', borderRadius: '10px',
                  background: 'rgba(232,86,10,0.12)', border: '1px solid rgba(232,86,10,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', marginBottom: '1.5rem',
                }}
              >
                🎬
              </div>
              <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Match Analyst
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--ember)', fontFamily: 'var(--font-barlow)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Desktop App · Free Download
              </p>
              <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300 }}>
                A free companion desktop app for rugby league coaches. Tag player stats against
                match video, export highlight clips, and generate PDF match reports — all offline,
                no subscription required.
              </p>
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                {['Tag events in real time with timestamps', 'Export clips with built-in ffmpeg', 'Generate PDF match reports', 'Works offline — no account needed'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span> {f}
                  </div>
                ))}
                <div style={{ marginTop: '1rem' }}>
                  <Link href="/analyst" style={{ fontSize: '0.85rem', color: 'var(--ember)', fontFamily: 'var(--font-barlow)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}>
                    Download free →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MID-PAGE CTA ────────────────────────────────────────── */}
        {!user && (
          <section style={{ padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <span className="section-label">Free to join</span>
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
                Try it today.<br />
                <span style={{ color: 'var(--ember)' }}>It&apos;s free.</span>
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300, lineHeight: 1.7, marginBottom: '2rem' }}>
                Start building your drill library and planning sessions — no credit card needed.
              </p>
              <Link href="/signup" className="cta-primary" style={{ fontSize: '1rem', padding: '14px 36px' }}>
                Create Free Account →
              </Link>
              <p style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>Takes 2 minutes</p>
            </div>
          </section>
        )}

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
                  body: 'Sign up free. Set your coaching profile, join or create your club, and invite your coaching staff. Two minutes to get started.',
                },
                {
                  n: '02',
                  title: 'Generate a Coaching Block',
                  body: 'Name your block, choose the number of sessions, and let AI plan every one upfront — balanced across all four focus areas. Your whole season structured before you step on the field.',
                },
                {
                  n: '03',
                  title: 'Prepare Each Session',
                  body: 'A week before each session, open it, review the AI plan, set the date, and add your own drills. If the team struggled on the weekend, swap sessions — the rotation stays intact.',
                },
                {
                  n: '04',
                  title: 'Share & Learn',
                  body: 'Publish drills to the community library. Discover what coaches across the game are running. Rate, comment, and build a coaching reputation.',
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

        {/* ── PRICING ─────────────────────────────────────────────── */}
        <section
          id="pricing"
          style={{
            padding: '7rem 2rem',
            background: 'linear-gradient(180deg, var(--bg) 0%, #100a06 30%, #100a06 70%, var(--bg) 100%)',
            borderTop: '2px solid rgba(232,86,10,0.25)',
            borderBottom: '2px solid rgba(232,86,10,0.25)',
            position: 'relative',
          }}
        >
          {/* Ember radial */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(232,86,10,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
            <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
              <span className="section-label">Simple Pricing</span>
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
                Start free.<br />
                <span style={{ color: 'var(--ember)' }}>Upgrade when ready.</span>
              </h2>
              <p style={{ marginTop: '1.25rem', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300, maxWidth: '480px', margin: '1.25rem auto 0' }}>
                No credit card required to start. Upgrade to Coach Pro for unlimited tools, or get Club for your entire coaching staff.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

              {/* Free */}
              <div className="feature-card" style={{ position: 'relative' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Free</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '3rem', color: 'var(--text)', lineHeight: 1 }}>£0</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/forever</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Everything you need to get started</p>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.5rem' }} />
                {[
                  'Up to 20 drills',
                  'Public drill library',
                  'Up to 3 session plans',
                  'AI coaching chat (20/day)',
                  'Community access',
                  'Public profile page',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
                <div style={{ marginTop: '2rem' }}>
                  <Link href="/signup" className="cta-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '12px 20px' }}>
                    Get Started Free
                  </Link>
                </div>
              </div>

              {/* Coach Pro */}
              <div
                className="feature-card"
                style={{
                  position: 'relative',
                  borderColor: 'rgba(99,102,241,0.4)',
                  background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(99,102,241,0.06) 100%)',
                  transform: 'scale(1.02)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(99,102,241,1)',
                    color: '#fff',
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Most Popular
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(99,102,241,0.9)', marginBottom: '0.5rem' }}>Coach Pro</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '3rem', color: 'var(--text)', lineHeight: 1 }}>£9.99</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/month</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>£89/year — save 26%</p>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.5rem' }} />
                {[
                  'Unlimited drills',
                  'PDF export',
                  'Unlimited AI coaching chat',
                  'All free features included',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'rgba(99,102,241,0.9)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
                <div style={{ marginTop: '2rem' }}>
                  <Link href="/signup" className="cta-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '12px 20px', background: 'rgba(99,102,241,1)' }}>
                    Start Coach Pro →
                  </Link>
                </div>
              </div>

              {/* Club */}
              <div
                className="feature-card"
                style={{
                  borderColor: 'rgba(232,86,10,0.3)',
                  background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.05) 100%)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '1.5rem',
                    background: 'rgba(232,86,10,0.15)',
                    color: 'var(--ember)',
                    border: '1px solid rgba(232,86,10,0.3)',
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Best Value
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.5rem' }}>Club</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '3rem', color: 'var(--text)', lineHeight: 1 }}>£24.99</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/month</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>£219/year — covers your whole club</p>
                </div>
                <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.5rem' }} />
                {[
                  'Everything in Coach Pro',
                  'Unlimited coaches in your club',
                  'Club private drill library',
                  'Coaching groups (up to 5)',
                  'Collaborative session plans',
                  'AI session guidance (GameSense)',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}
                <div style={{ marginTop: '2rem' }}>
                  <Link href="/signup" className="cta-primary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '12px 20px' }}>
                    Get Club Plan →
                  </Link>
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '2.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Prices in GBP. Club plan covers all coaches in one club — no per-seat fees. Cancel anytime.
            </p>
          </div>
        </section>

        {/* ── SERVICES ────────────────────────────────────────────── */}
        <section
          id="services"
          className="services-section"
          style={{
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(232,86,10,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>

            <div className="services-intro-header" style={{ textAlign: 'center' }}>
              <span className="section-label">Coaching Eye</span>
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
                I see what<br />
                <span style={{ color: 'var(--ember)' }}>coaches miss.</span>
              </h2>
              <p className="services-intro-text" style={{ marginTop: '1.25rem', fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 300, maxWidth: '560px', margin: '1.25rem auto 0' }}>
                Twenty years in professional rugby league as a player and coach. I watch footage the way I used to study tape before a big game — and I&apos;ll tell you exactly what&apos;s there.
              </p>
            </div>

            <div className="services-grid">

              {/* Match Review */}
              <div className="feature-card" style={{ position: 'relative', borderColor: 'rgba(232,86,10,0.25)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <p className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.5rem' }}>Match Review</p>
                  <h3 className="lp-heading service-card-title" style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2 }}>Individual Player Analysis</h3>
                  <p className="service-desc-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Send me footage of your player in a match or a training session. I&apos;ll watch it properly, tell you exactly what they&apos;re doing well and where they&apos;re costing your team, and give you something you can act on in your next session.
                  </p>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.25rem' }} />

                {/* Pricing tiers */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 120px', background: 'var(--surface2)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Standard</p>
                    <p className="lp-display service-price" style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1 }}>£50</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Delivered in 72hrs</p>
                  </div>
                  <div style={{ flex: '1 1 120px', background: 'rgba(232,86,10,0.08)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(232,86,10,0.25)', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-10px', right: '10px', background: 'var(--ember)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px' }}>Express</span>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.25rem' }}>Express</p>
                    <p className="lp-display service-price" style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1 }}>£80</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Delivered in 24hrs</p>
                  </div>
                </div>

                {[
                  'Written PDF report delivered by email',
                  'Key strengths and areas to improve',
                  'Specific coaching points and cues',
                  'Zoom call available on request',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(232,86,10,0.06)', border: '1px solid rgba(232,86,10,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--ember)' }}>
                    ★ Coach Pro &amp; Club members save £10 on every request
                  </div>
                  <div style={{ marginTop: '1.25rem' }}>
                    <Link href="/analysis" className="cta-primary service-cta" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '12px 20px' }}>
                      {user ? 'Request Analysis →' : 'Get Started →'}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Opposition Scouting */}
              <div
                className="feature-card"
                style={{
                  position: 'relative',
                  borderColor: 'rgba(232,86,10,0.35)',
                  background: 'linear-gradient(135deg, var(--surface2) 0%, rgba(232,86,10,0.05) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '1.5rem',
                    background: 'rgba(232,86,10,0.15)',
                    color: 'var(--ember)',
                    border: '1px solid rgba(232,86,10,0.3)',
                    fontFamily: 'var(--font-barlow)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Most Detailed
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <p className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.5rem' }}>Opposition Scouting</p>
                  <h3 className="lp-heading service-card-title" style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2 }}>Pre-Match Opponent Analysis</h3>
                  <p className="service-desc-text" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    I&apos;ve played against the best and the worst at every level. Give me footage of your next opponents and I&apos;ll break down their defensive shape, their set-play calls, where they go under pressure, and where the edge is. You&apos;ll walk into that dressing room knowing more about them than most of their own coaches do.
                  </p>
                </div>

                <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.25rem' }} />

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 120px', background: 'var(--surface2)', borderRadius: '10px', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '0.25rem' }}>Standard</p>
                    <p className="lp-display service-price" style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1 }}>£75</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Delivered in 72hrs</p>
                  </div>
                  <div style={{ flex: '1 1 120px', background: 'rgba(232,86,10,0.08)', borderRadius: '10px', padding: '1rem', border: '1px solid rgba(232,86,10,0.25)', position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '-10px', right: '10px', background: 'var(--ember)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px' }}>Express</span>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.25rem' }}>Express</p>
                    <p className="lp-display service-price" style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--text)', lineHeight: 1 }}>£110</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>Delivered in 24hrs</p>
                  </div>
                </div>

                {[
                  'Attacking shape and patterns of play',
                  'Defensive structure and tendencies',
                  'Set play identification and key threats',
                  'Written PDF report delivered by email',
                  'Zoom call available on request',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--ember)', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </div>
                ))}

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem' }}>
                  <div style={{ padding: '0.75rem 1rem', background: 'rgba(232,86,10,0.06)', border: '1px solid rgba(232,86,10,0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--ember)' }}>
                    ★ Coach Pro &amp; Club members save £10 on every request
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <Link href="/analysis" className="cta-primary service-cta" style={{ width: '100%', justifyContent: 'center', fontSize: '0.9rem', padding: '12px 20px' }}>
                      {user ? 'Request Scouting →' : 'Get Started →'}
                    </Link>
                  </div>
                </div>
              </div>

            </div>

            {/* How to submit */}
            <div style={{ marginTop: '3rem', background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '2rem' }}>
              <h4 className="lp-heading" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.25rem' }}>How to share your footage</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.5rem' }}>YouTube (recommended)</p>
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    <li>Upload your video to YouTube</li>
                    <li>Set visibility to <strong style={{ color: 'var(--text)' }}>Unlisted</strong></li>
                    <li>Copy the link and paste it in the form</li>
                  </ol>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Unlisted means only people with the link can view it — it won&apos;t appear in search results.</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ember)', marginBottom: '0.5rem' }}>Google Drive</p>
                  <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                    <li>Upload the video to Google Drive</li>
                    <li>Right-click → <strong style={{ color: 'var(--text)' }}>Share</strong></li>
                    <li>Change access to <strong style={{ color: 'var(--text)' }}>Anyone with the link</strong></li>
                    <li>Copy and paste the link in the form</li>
                  </ol>
                </div>
              </div>
              <p style={{ marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                Questions? Drop me a line at <a href="mailto:analysis@18thman.app" style={{ color: 'var(--ember)', textDecoration: 'none' }}>analysis@18thman.app</a>
              </p>
            </div>

          </div>
        </section>

        {/* ── LEAD MAGNET ─────────────────────────────────────────── */}
        {!user && (
          <section style={{ padding: '5rem 2rem' }}>
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                background: 'var(--surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '20px',
                padding: 'clamp(2rem, 5vw, 3rem)',
                display: 'flex',
                gap: '3rem',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
              }}
            >
              {/* Left: copy */}
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <span className="section-label" style={{ marginBottom: '1rem', display: 'block' }}>Free Download</span>
                <h2
                  className="lp-heading"
                  style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', marginBottom: '0.75rem', lineHeight: 1.2 }}
                >
                  Get a free 4-week rugby league training plan
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: 0 }}>
                  Ready-made sessions with drill descriptions and coach notes — yours to print and take to training. No account needed.
                </p>
              </div>

              {/* Right: form */}
              <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                <DownloadForm />
              </div>
            </div>
          </section>
        )}

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

      {!user && <ExitIntentPopup />}
    </>
  )
}
