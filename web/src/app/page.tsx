import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Barlow_Condensed, Source_Serif_4 } from 'next/font/google'
import { DownloadForm } from '@/components/landing/DownloadForm'
import { ExitIntentPopup } from '@/components/landing/ExitIntentPopup'
import { MobileMenu } from '@/components/landing/MobileMenu'
import { PricingSection } from '@/components/landing/PricingSection'

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

function HexGridBg({ opacity = 0.08, color = '#e8560a' }: { opacity?: number; color?: string }) {
  const R = 45
  const W = R * Math.sqrt(3)
  const vstep = R * 1.5
  const cols = Math.ceil(1440 / W) + 3
  const rows = Math.ceil(900 / vstep) + 3

  const pts = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = -Math.PI / 2 + (Math.PI / 3) * i
      return `${Math.round(cx + R * Math.cos(a))},${Math.round(cy + R * Math.sin(a))}`
    }).join(' ')

  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: rows }, (_, row) => {
        const y = (row - 1) * vstep
        const offsetX = row % 2 !== 0 ? W / 2 : 0
        return Array.from({ length: cols }, (_, col) => {
          const x = (col - 1) * W + offsetX
          return (
            <polygon
              key={`${row}-${col}`}
              points={pts(x, y)}
              fill="none"
              stroke={color}
              strokeWidth="0.8"
            />
          )
        })
      })}
    </svg>
  )
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

export const metadata = {
  title: '18th Man — The Coaching Platform for Rugby League',
  description:
    'Design drills on a digital canvas, plan training sessions, get instant AI coaching advice, and share knowledge with a community of rugby league coaches. Free to join.',
  keywords: [
    'rugby league coaching platform',
    'rugby league drill designer',
    'rugby league session planner',
    'AI rugby league coach',
    'free rugby league tools',
    'rugby league training drills',
    'GameSense coaching',
    'rugby league coaching app',
  ],
  alternates: { canonical: siteUrl },
  openGraph: {
    type: 'website' as const,
    url: siteUrl,
    title: '18th Man — The Coaching Platform for Rugby League',
    description:
      'Design drills on a digital canvas, plan training sessions, get instant AI coaching advice, and share knowledge with a community of rugby league coaches.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: '18th Man — Rugby League Coaching Platform' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: '18th Man — The Coaching Platform for Rugby League',
    description:
      'Design drills on a digital canvas, plan training sessions, get instant AI coaching advice, and share knowledge with a community of rugby league coaches.',
    images: ['/opengraph-image'],
  },
}

const MARQUEE_ITEMS = [
  'Design drills on a digital canvas',
  'AI-planned coaching blocks, every session covered',
  'Weekly coaching focus with community discussion',
  'Club groups with private content',
  'Game Sense session structure built in',
  'S&C and AI coaching assistant',
  'Player wellbeing tracking',
  'Match Analyst desktop app',
]

const PILLARS = [
  {
    n: '01',
    kicker: 'Draw it',
    title: 'Drill Designer',
    body: 'Draw drills on a digital canvas exactly as you would on a whiteboard — players, cones, arrows, zones. Build your private library and share with the community.',
    points: ['Player markers & formations', 'Movement arrows & zones', 'Video links & preview images', 'AI coaching guide per drill'],
  },
  {
    n: '02',
    kicker: 'Plan it',
    title: 'Coaching Blocks',
    body: "Name your block, choose how many sessions, and AI plans every single one upfront — balanced across Attack, Defence, Completions and Skills. The whole season, sorted before it starts.",
    points: ['AI-generated Game Sense session plans', 'Balanced focus area rotation', 'Swap sessions when the team struggles', 'Track progress across the block'],
  },
  {
    n: '03',
    kicker: 'Share it',
    title: 'Club & Community',
    body: 'Create a club, invite your coaching staff into private groups and collaborate on session plans. Publish drills to the open library and discover what coaches across the game are running.',
    points: ['Private club drill libraries', 'Coaching groups for your staff', 'Rate and review drills', 'Weekly coaching focus discussion'],
  },
]

const EXTRAS = [
  { title: 'Weekly Focus', body: 'A coaching topic each week — Edge Defence, Line Speed, Completion Rate — with drills, session ideas and discussion.' },
  { title: 'Player Wellbeing', body: 'Check-ins, load monitoring and mood tracking so you can adjust training to what the squad actually needs.' },
  { title: 'Match Analyst', body: 'Desktop app for Coach Pro and Club members. Tag stats against match video, export clips, generate PDF reports — offline.' },
  { title: 'PDF Session Export', body: 'Print-ready session plans for the training ground, with drills, timing and coach notes built in.' },
]

const STEPS = [
  { n: '01', title: 'Create your account', body: 'Sign up free. Set your coaching profile, join or create your club, and invite your coaching staff. Two minutes to get started.' },
  { n: '02', title: 'Generate a coaching block', body: 'Name your block, choose the number of sessions, and let AI plan every one upfront — balanced across all four focus areas.' },
  { n: '03', title: 'Prepare each session', body: "A week before each session, review the AI plan, set the date and add your own drills. If the team struggled on the weekend, swap sessions — the rotation stays intact." },
  { n: '04', title: 'Share & learn', body: 'Publish drills to the community library. Discover what coaches across the game are running. Rate, comment, and build a coaching reputation.' },
]

const SERVICES = [
  {
    title: 'Individual Player Analysis',
    body: "Send me footage of your player in a match or training. I'll tell you exactly what they're doing well, where they're costing your team, and what to work on next session.",
    std: '£50',
    exp: '£80',
  },
  {
    title: 'Pre-Match Opponent Analysis',
    body: "Give me footage of your next opponents and I'll break down their defensive shape, set-play calls, where they go under pressure, and where the edge is.",
    std: '£75',
    exp: '£110',
  },
]

const FOOTER_LINKS = [
  { label: 'Drill Library', href: '/drills' },
  { label: 'Community', href: '/chat/community' },
  { label: 'Analyst', href: '/analyst' },
  { label: 'Contact', href: '/contact' },
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Sign In', href: '/login' },
]

interface LandingStats {
  coach_count: number
  drill_count: number
  session_count: number
}

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: statsRows, error: statsError } = await supabase.rpc('get_landing_stats')
  const stats: LandingStats | null =
    !statsError && Array.isArray(statsRows) && statsRows[0] ? (statsRows[0] as LandingStats) : null

  return (
    <>
      <style>{`
        :root {
          --ember: #e8560a;
          --bg: #050608;
          --surface: #0a0b0f;
          --card: #0f1219;
          --text: #f4f4f2;
          --text-secondary: #c9c6bf;
          --text-muted: #a8a6a1;
          --list-text: #d6d3cc;
          --steel: #62666d;
          --hairline: rgba(255,255,255,0.06);
          --border: rgba(255,255,255,0.1);
          --pitch: #0a2b14;
        }
        .lp { font-family: var(--font-serif), Georgia, serif; color-scheme: dark; }
        .lp-display { font-family: var(--font-barlow), system-ui, sans-serif; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(60px) skewX(-12deg); } to { opacity: 1; transform: translateX(0) skewX(-12deg); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes dash { to { stroke-dashoffset: -40; } }
        @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(232,86,10,0); } 50% { box-shadow: 0 0 36px 6px rgba(232,86,10,0.22); } }

        .reveal-text { animation: fadeUp 0.8s cubic-bezier(.22,.6,.36,1) 0.15s both; }
        .reveal-card { animation: fadeUp 0.9s cubic-bezier(.22,.6,.36,1) 0.4s both; }
        .reveal-slash { animation: slideIn 0.9s cubic-bezier(.22,.6,.36,1) both; }
        .dash-line { animation: dash 1.6s linear infinite; }
        .marquee-track { display: flex; width: max-content; animation: marquee 30s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .btn-pulse { animation: pulseGlow 3s ease-in-out 1.5s infinite; }

        @media (prefers-reduced-motion: reduce) {
          .reveal-text, .reveal-card, .reveal-slash, .dash-line, .marquee-track, .btn-pulse { animation: none; }
        }

        .btn-angled {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
          text-decoration: none;
          white-space: nowrap;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.15s, border-color 0.15s, background 0.15s, transform 0.1s;
        }
        .btn-angled:active { transform: translateY(1px); }
        .btn-primary { background: var(--ember); color: #fff; font-weight: 800; font-style: italic; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-ghost { background: transparent; color: var(--text); font-weight: 700; border: 1.5px solid rgba(244,244,242,0.28); }
        .btn-ghost:hover { border-color: var(--text); background: rgba(255,255,255,0.05); }
        .btn-plan-cta:hover { opacity: 0.85; }

        .nav-link { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); text-decoration: none; padding: 10px 0; transition: color 0.15s; }
        .nav-link:hover { color: var(--text); }
        .nav-signin { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); text-decoration: none; padding: 10px 14px; transition: color 0.15s; }
        .nav-signin:hover { color: var(--ember); }

        /* Chromium restricts :visited styling to a small safe property set (color
           among them) and ignores non-important declarations there even when an
           author rule already sets the same color for the unvisited state — an
           explicit !important :visited rule is the sanctioned escape hatch. */
        .btn-primary:visited { color: #fff !important; }
        .btn-ghost:visited { color: var(--text) !important; }
        .btn-plan-cta:visited { color: #f4f4f2 !important; }
        .nav-link:visited { color: var(--text-muted) !important; }
        .nav-signin:visited { color: var(--text) !important; }

        .nav-links { display: flex; align-items: center; gap: 1.75rem; }
        @media (max-width: 767px) { .nav-links { display: none; } }
        @media (max-width: 767px) { .nav-desktop-only { display: none; } }
        .mobile-nav-toggle { display: none; align-items: center; justify-content: center; width: 44px; height: 44px; background: transparent; border: none; color: var(--text); cursor: pointer; }
        @media (max-width: 767px) { .mobile-nav-toggle { display: flex; } }
        .mobile-nav-panel { position: absolute; top: 68px; left: 0; right: 0; background: var(--bg); border-bottom: 1px solid var(--hairline); display: flex; flex-direction: column; padding: 0.5rem 1rem 1rem; }
        .mobile-nav-item { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); text-decoration: none; padding: 14px 8px; border-bottom: 1px solid var(--hairline); }
        .mobile-nav-item:last-child { border-bottom: none; }
        .mobile-nav-item-accent { color: var(--ember); }
        .mobile-nav-item:visited { color: var(--text) !important; }
        .mobile-nav-item-accent:visited { color: var(--ember) !important; }

        .section-label { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ember); }

        .pillar-card { background: var(--bg); outline: 1px solid var(--hairline); padding: 2.25rem 2rem 2rem; display: flex; flex-direction: column; position: relative; overflow: hidden; transition: background 0.2s; }
        .pillar-card:hover { background: var(--surface); }

        .stat-pill { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; font-style: italic; color: var(--text-muted); font-size: 0.9rem; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; padding: 0 2.25rem; }
        .stat-pill span { color: var(--ember); margin-right: 0.6rem; }

        .footer-link { text-decoration: none; font-size: 0.82rem; color: var(--text-muted); font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; padding: 10px 0; transition: color 0.15s; }
        .footer-link:hover { color: var(--text); }
        .footer-link:visited { color: var(--text-muted) !important; }

        .services-link { font-family: var(--font-barlow), system-ui, sans-serif; font-weight: 800; font-size: 0.9rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ember); text-decoration: none; border-bottom: 2px solid var(--ember); padding-bottom: 2px; display: inline-block; }
        .services-link:visited { color: var(--ember) !important; }

        .section-pad { padding: clamp(5rem, 9vw, 8rem) clamp(1rem, 3vw, 2rem); }
        @media (max-width: 639px) { .section-pad { padding: 3.5rem 1rem; } }
      `}</style>

      <div className={`${barlow.variable} ${serif.variable} lp`} style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh', overflowX: 'clip' }}>
        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(5,6,8,0.86)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--hairline)' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(1rem,3vw,2rem)', gap: '1rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
              <Image src="/logo.png" alt="18th Man" width={513} height={537} style={{ height: 38, width: 'auto', flexShrink: 0 }} />
              <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.3rem', letterSpacing: '0.02em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                18TH MAN
              </span>
            </Link>

            <div className="nav-links">
              <a href="#features" className="nav-link">Platform</a>
              <a href="#how" className="nav-link">How it works</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#services" className="nav-link">Coaching Eye</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {user ? (
                <Link href="/dashboard" className="btn-angled btn-primary" style={{ fontSize: '0.95rem', padding: '11px 20px' }}>
                  Go to dashboard →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="nav-signin nav-desktop-only">Sign in</Link>
                  <Link href="/signup" className="btn-angled btn-primary" style={{ fontSize: '0.95rem', padding: '11px 20px' }}>
                    Start free
                  </Link>
                </>
              )}
              <MobileMenu signedIn={!!user} />
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg)', minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center' }}>
          <HexGridBg opacity={0.07} />

          <div className="reveal-slash" style={{ position: 'absolute', top: 0, bottom: 0, right: '-12vw', width: '46vw', background: 'var(--ember)', transform: 'skewX(-12deg)', transformOrigin: 'top', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: '-14vw', width: '46vw', background: 'rgba(232,86,10,0.16)', transform: 'translateX(-2.2vw) skewX(-12deg)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '-30%', right: '20%', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,86,10,0.18) 0%, transparent 60%)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto', width: '100%', padding: 'clamp(3rem,7vw,6rem) clamp(1rem,3vw,2rem) clamp(3rem,6vw,5rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,460px),1fr))', gap: '3rem', alignItems: 'center' }}>
            <div className="reveal-text">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                <span style={{ display: 'block', width: '28px', height: '3px', background: 'var(--ember)', transform: 'skewX(-20deg)' }} />
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ember)' }}>
                  The coaching platform for rugby league
                </span>
              </div>
              <h1 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(3.4rem,8.5vw,7.6rem)', lineHeight: 0.86, letterSpacing: '-0.015em', textTransform: 'uppercase' }}>
                <span style={{ display: 'block', color: 'var(--text)' }}>Better sessions.</span>
                <span style={{ display: 'block', color: 'var(--text)' }}>Better players.</span>
                <span style={{ display: 'block', color: 'var(--ember)' }}>Better coaches.</span>
              </h1>
              <p style={{ fontSize: 'clamp(1.05rem,1.6vw,1.25rem)', lineHeight: 1.6, color: 'var(--text-secondary)', maxWidth: '500px', marginTop: '1.75rem', fontWeight: 300 }}>
                Stop winging it on the whiteboard. 18th Man gives rugby league coaches ready-made drills, AI-planned session blocks, and a community sharing what actually works at training.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginTop: '2.25rem' }}>
                {user ? (
                  <Link href="/dashboard" className="btn-angled btn-primary btn-pulse" style={{ fontSize: '1.15rem', padding: '16px 34px' }}>
                    Go to dashboard <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn-angled btn-primary btn-pulse" style={{ fontSize: '1.15rem', padding: '16px 34px' }}>
                      Create free account <span aria-hidden="true">→</span>
                    </Link>
                    <a href="#pricing" className="btn-angled btn-ghost" style={{ fontSize: '1.15rem', padding: '15px 28px' }}>
                      See Coach Pro
                    </a>
                  </>
                )}
              </div>
              {!user && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginTop: '1.25rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
                  <span>Free forever plan</span><span style={{ color: 'var(--ember)' }}>◆</span><span>No credit card</span><span style={{ color: 'var(--ember)' }}>◆</span><span>Set up in 2 minutes</span>
                </div>
              )}
            </div>

            <div className="reveal-card" style={{ position: 'relative' }}>
              <div style={{ position: 'relative', transform: 'rotate(-2deg)' }}>
                <div className="lp-display" style={{ position: 'absolute', top: '-16px', left: '24px', zIndex: 2, background: 'var(--bg)', color: 'var(--text)', border: '1.5px solid var(--ember)', fontWeight: 800, fontStyle: 'italic', fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', padding: '6px 16px', clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)' }}>
                  Drill Designer
                </div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.7)' }}>
                  <div style={{ height: '40px', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem' }}>
                    <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Line Speed — Attack vs Defence</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ fontFamily: 'var(--font-mono, ui-monospace)', fontSize: '0.7rem', color: 'var(--steel)' }}>12 min · U16</span>
                  </div>
                  <div style={{ position: 'relative', background: 'var(--pitch)', aspectRatio: '16/10', overflow: 'hidden' }}>
                    <svg viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                      <defs>
                        <marker id="rao" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e8560a" /></marker>
                        <marker id="rad" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="rgba(232,86,10,0.6)" /></marker>
                      </defs>
                      <line x1="20" y1="0" x2="20" y2="300" stroke="white" strokeOpacity="0.14" />
                      <line x1="460" y1="0" x2="460" y2="300" stroke="white" strokeOpacity="0.14" />
                      <line x1="20" y1="50" x2="460" y2="50" stroke="white" strokeOpacity="0.3" strokeWidth="1.5" />
                      <line x1="20" y1="130" x2="460" y2="130" stroke="white" strokeOpacity="0.08" />
                      <line x1="20" y1="210" x2="460" y2="210" stroke="white" strokeOpacity="0.06" />
                      <rect x="100" y="50" width="280" height="100" fill="rgba(232,86,10,0.05)" stroke="rgba(232,86,10,0.18)" strokeDasharray="4,3" />
                      <circle cx="130" cy="88" r="15" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" /><text x="130" y="92" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>
                      <circle cx="240" cy="80" r="15" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" /><text x="240" y="84" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>
                      <circle cx="350" cy="88" r="15" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" /><text x="350" y="92" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="8" fontWeight="bold" fontFamily="system-ui">DEF</text>
                      <circle cx="240" cy="232" r="18" fill="rgba(232,86,10,0.25)" stroke="#e8560a" strokeWidth="2" /><text x="240" y="237" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="bold" fontFamily="system-ui">7</text>
                      <circle cx="160" cy="236" r="15" fill="rgba(232,86,10,0.14)" stroke="rgba(232,86,10,0.6)" strokeWidth="1.5" /><text x="160" y="241" textAnchor="middle" fill="#f4f4f2" fontSize="10" fontWeight="bold" fontFamily="system-ui">6</text>
                      <circle cx="320" cy="236" r="15" fill="rgba(232,86,10,0.14)" stroke="rgba(232,86,10,0.6)" strokeWidth="1.5" /><text x="320" y="241" textAnchor="middle" fill="#f4f4f2" fontSize="10" fontWeight="bold" fontFamily="system-ui">8</text>
                      <circle cx="70" cy="240" r="13" fill="rgba(232,86,10,0.08)" stroke="rgba(232,86,10,0.45)" strokeWidth="1.5" /><text x="70" y="244" textAnchor="middle" fill="#f4f4f2" fontSize="10" fontFamily="system-ui">5</text>
                      <circle cx="410" cy="240" r="13" fill="rgba(232,86,10,0.08)" stroke="rgba(232,86,10,0.45)" strokeWidth="1.5" /><text x="410" y="244" textAnchor="middle" fill="#f4f4f2" fontSize="10" fontFamily="system-ui">2</text>
                      <line className="dash-line" x1="240" y1="212" x2="240" y2="112" stroke="#e8560a" strokeWidth="2.5" strokeDasharray="8,4" markerEnd="url(#rao)" />
                      <line x1="160" y1="220" x2="190" y2="122" stroke="rgba(232,86,10,0.6)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#rad)" />
                      <line x1="320" y1="220" x2="290" y2="122" stroke="rgba(232,86,10,0.6)" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#rad)" />
                      <path d="M70,226 Q52,165 96,112" stroke="rgba(232,86,10,0.35)" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
                      <path d="M410,226 Q428,165 384,112" stroke="rgba(232,86,10,0.35)" strokeWidth="1.5" fill="none" strokeDasharray="5,3" />
                      <polygon points="88,168 82,180 94,180" fill="#eab308" /><polygon points="392,168 386,180 398,180" fill="#eab308" />
                    </svg>
                    <div style={{ position: 'absolute', bottom: '14px', left: '14px', background: 'rgba(5,6,8,0.8)', backdropFilter: 'blur(8px)', borderLeft: '3px solid var(--ember)', padding: '10px 14px', maxWidth: '190px' }}>
                      <div className="lp-display" style={{ fontSize: '0.66rem', color: 'var(--ember)', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '6px' }}>AI coaching points</div>
                      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--list-text)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>→ Push off the back foot</span><span>→ Shoulders square</span><span>→ Communicate early</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: '38px', background: 'var(--bg)', borderTop: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem' }}>
                    <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Session 3 · Attack block</span>
                    <span style={{ flex: 1 }} />
                    <span className="lp-display" style={{ fontWeight: 800, fontSize: '0.72rem', color: 'var(--ember)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Saved to club library ✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SCOREBOARD ──────────────────────────────────────────── */}
        {stats && (
          <div style={{ background: 'var(--ember)', color: '#fff', overflow: 'hidden' }}>
            <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '1.5rem clamp(1rem,3vw,2rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.4rem,4vw,3.4rem)', lineHeight: 1 }}>{stats.coach_count.toLocaleString('en-GB')}</span>
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2 }}>coaches<br />signed up</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.4rem,4vw,3.4rem)', lineHeight: 1 }}>{stats.drill_count.toLocaleString('en-GB')}</span>
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2 }}>drills in<br />the library</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.4rem,4vw,3.4rem)', lineHeight: 1 }}>{stats.session_count.toLocaleString('en-GB')}</span>
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2 }}>sessions<br />planned</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.4rem,4vw,3.4rem)', lineHeight: 1 }}>£0</span>
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1.2 }}>to get<br />started</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MARQUEE ─────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--hairline)', padding: '0.85rem 0', overflow: 'hidden' }}>
          <div className="marquee-track">
            {[0, 1].map(i => (
              <div key={i} style={{ display: 'flex' }}>
                {MARQUEE_ITEMS.map(item => (
                  <span key={item} className="stat-pill"><span>◆</span>{item}</span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── THREE PILLARS ───────────────────────────────────────── */}
        <section id="features" className="section-pad" style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem 3rem', marginBottom: '3.5rem' }}>
            <div>
              <span className="section-label">What 18th Man gives you</span>
              <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.8rem,5.5vw,4.8rem)', lineHeight: 0.9, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.75rem' }}>
                Whiteboard to<br />training ground,<br /><span style={{ color: 'var(--ember)' }}>one workflow.</span>
              </h2>
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.65, color: 'var(--text-muted)', fontWeight: 300, maxWidth: '400px' }}>
              Build a drill once. It flows into your session plan, your AI coach&apos;s context and the community without re-entering it anywhere.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,320px),1fr))', gap: '2px' }}>
            {PILLARS.map(p => (
              <div key={p.n} className="pillar-card">
                <div className="lp-display" aria-hidden="true" style={{ position: 'absolute', top: '-10px', right: '14px', fontWeight: 800, fontStyle: 'italic', fontSize: '7rem', lineHeight: 1, color: 'rgba(232,86,10,0.1)', userSelect: 'none' }}>{p.n}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
                  <span style={{ display: 'block', width: '22px', height: '3px', background: 'var(--ember)', transform: 'skewX(-20deg)' }} />
                  <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ember)' }}>{p.kicker}</span>
                </div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '2.1rem', lineHeight: 0.95, textTransform: 'uppercase', color: 'var(--text)', marginBottom: '1rem' }}>{p.title}</h3>
                <p style={{ fontSize: '1rem', lineHeight: 1.65, color: 'var(--text-muted)', fontWeight: 300, marginBottom: '1.5rem' }}>{p.body}</p>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                  {p.points.map(pt => (
                    <div key={pt} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--list-text)' }}>
                      <span style={{ color: 'var(--ember)', fontWeight: 700 }}>→</span>{pt}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,240px),1fr))', gap: '2px' }}>
            {EXTRAS.map(x => (
              <div key={x.title} style={{ background: 'var(--surface)', outline: '1px solid var(--hairline)', padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="lp-display" style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>{x.title}</div>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--text-muted)', fontWeight: 300 }}>{x.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI CHAT ─────────────────────────────────────────────── */}
        <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '-20vw', width: '34vw', background: 'rgba(232,86,10,0.05)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />
          <div className="section-pad" style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,340px),1fr))', gap: '4rem', alignItems: 'center' }}>
            <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ padding: '0.85rem 1.25rem', background: 'var(--bg)', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '8px', height: '8px', background: 'var(--ember)', transform: 'rotate(45deg)', display: 'block' }} />
                <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Coaching Assistant</span>
              </div>
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--ember)', padding: '10px 14px', maxWidth: '82%', fontSize: '0.875rem', color: '#fff', lineHeight: 1.5, clipPath: 'polygon(6px 0, 100% 0, 100% 100%, 0 100%, 0 6px)' }}>
                    What&apos;s a good drill to improve line speed in defence for an U18 side?
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 16px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Defensive Line Speed Drill — &quot;Blitz &amp; Shuffle&quot;</div>
                  <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--ember)', fontWeight: 600 }}>Setup:</strong> 6 attackers in a flat line, 6 defenders 5m back. Cones mark the D-line start position.</div>
                  <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--ember)', fontWeight: 600 }}>Key coaching points:</strong> Push off the back foot, shoulders square, communicate early.</div>
                  <div style={{ marginBottom: '6px' }}><strong style={{ color: 'var(--ember)', fontWeight: 600 }}>Progression:</strong> Add a second phase — defenders reset and go again inside 4 seconds.</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.18)', padding: '5px 10px' }}>Save as drill</span>
                    <span className="lp-display" style={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.18)', padding: '5px 10px' }}>Add to session 3</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <span className="section-label">Three AI coaches, one platform</span>
              <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.8rem,5.5vw,4.8rem)', lineHeight: 0.9, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                Ask a coaching question.<br /><span style={{ color: 'var(--ember)' }}>Get a coaching answer.</span>
              </h2>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300, marginBottom: '1.75rem' }}>
                The Coaching Assistant speaks rugby league — drills, sets, tackles, defensive structures, positional play. The S&amp;C Coach handles conditioning, gym programs and recovery. GameSense structures your entire season. Every drill you create also receives an AI coaching guide: key points, common errors, progressions and warm-ups.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: '2px', background: 'rgba(255,255,255,0.08)' }}>
                {[
                  { name: 'Coaching', desc: 'Drills, tactics, sessions' },
                  { name: 'S&C', desc: 'Conditioning, gym, recovery' },
                  { name: 'GameSense', desc: 'Whole-season structure' },
                ].map(c => (
                  <div key={c.name} style={{ background: 'var(--surface)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.3rem', textTransform: 'uppercase', color: 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────── */}
        <section id="how" className="section-pad" style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ marginBottom: '3.5rem' }}>
            <span className="section-label">How it works</span>
            <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.8rem,5.5vw,4.8rem)', lineHeight: 0.9, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.75rem' }}>
              Up and coaching<br /><span style={{ color: 'var(--ember)' }}>in minutes.</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,240px),1fr))', gap: '2.5rem 2rem' }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ position: 'relative', paddingTop: '1.5rem', borderTop: '3px solid var(--ember)' }}>
                <div className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '3.6rem', lineHeight: 1, color: 'var(--ember)', marginBottom: '0.75rem' }}>{s.n}</div>
                <h3 className="lp-display" style={{ fontWeight: 800, fontSize: '1.35rem', textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text)', marginBottom: '0.6rem' }}>{s.title}</h3>
                <p style={{ fontSize: '0.98rem', lineHeight: 1.65, color: 'var(--text-muted)', fontWeight: 300 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOUNDER ─────────────────────────────────────────────── */}
        <section style={{ background: 'var(--ember)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <HexGridBg opacity={0.12} color="#fff" />
          <div className="section-pad" style={{ position: 'relative', maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: '3rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: '112px', height: '128px', flexShrink: 0, background: 'rgba(255,255,255,0.15)', clipPath: 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.8rem', color: '#fff' }}>NJ</span>
              </div>
              <div>
                <div className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.6rem', textTransform: 'uppercase', lineHeight: 1 }}>Nick Johnson</div>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.9rem', lineHeight: 1.6, marginTop: '8px', opacity: 0.95 }}>
                  Youth Team Coach<br />Ex Pro Rugby League Player<br />Level 2 Rugby League Coach<br />20+ years in the game
                </div>
                <div className="lp-display" style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.16em', textTransform: 'uppercase', borderTop: '2px solid rgba(255,255,255,0.5)', paddingTop: '8px', display: 'inline-block' }}>
                  Creator of 18th Man
                </div>
              </div>
            </div>
            <p style={{ fontSize: 'clamp(1.3rem,2.4vw,1.9rem)', lineHeight: 1.4, fontWeight: 400, fontStyle: 'italic' }}>
              &ldquo;I built 18th Man because I was coaching at the grassroots level and couldn&apos;t find tools that spoke the language of rugby league. The drills, the sets, the defensive structures — everything coaches actually talk about on the training field.&rdquo;
            </p>
          </div>
        </section>

        {/* ── PRICING ─────────────────────────────────────────────── */}
        <section id="pricing" className="section-pad" style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <PricingSection />
        </section>

        {/* ── COACHING EYE ────────────────────────────────────────── */}
        <section id="services" style={{ background: 'var(--surface)', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)' }}>
          <div className="section-pad" style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: '3rem 4rem', alignItems: 'start' }}>
            <div>
              <span className="section-label">Coaching Eye · Analysis service</span>
              <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2.8rem,5.5vw,4.8rem)', lineHeight: 0.9, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
                I see what<br /><span style={{ color: 'var(--ember)' }}>coaches miss.</span>
              </h2>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text-muted)', fontWeight: 300, marginBottom: '1.5rem' }}>
                Twenty years in professional rugby league as a player and coach. Send me footage and I watch it the way I used to study tape before a big game — then tell you exactly what&apos;s there, in a written PDF report by email. Zoom call available on request.
              </p>
              <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.85rem', color: 'var(--ember)' }}>★ Coach Pro &amp; Club members save £10 on every request</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.08)' }}>
              {SERVICES.map(sv => (
                <div key={sv.title} style={{ background: 'var(--bg)', padding: '1.75rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '1.5rem', alignItems: 'start' }}>
                  <div>
                    <div className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.6rem', textTransform: 'uppercase', color: 'var(--text)', lineHeight: 1 }}>{sv.title}</div>
                    <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-muted)', fontWeight: 300, marginTop: '8px' }}>{sv.body}</p>
                    <Link href="/analysis" className="services-link" style={{ marginTop: '14px' }}>Request →</Link>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'right' }}>
                    <div>
                      <div className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '2rem', color: 'var(--text)', lineHeight: 1 }}>{sv.std}</div>
                      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Standard · 72hrs</div>
                    </div>
                    <div>
                      <div className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '2rem', color: 'var(--ember)', lineHeight: 1 }}>{sv.exp}</div>
                      <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Express · 24hrs</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LEAD MAGNET ─────────────────────────────────────────── */}
        {!user && (
          <section style={{ padding: 'clamp(4rem,8vw,6rem) clamp(1rem,3vw,2rem)', maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ border: '1px solid rgba(232,86,10,0.4)', padding: 'clamp(1.75rem,4vw,3rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px),1fr))', gap: '2.5rem', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, right: '-6%', width: '22%', background: 'rgba(232,86,10,0.07)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative' }}>
                <span className="section-label">Free training block · no account needed</span>
                <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(2rem,3.6vw,3rem)', lineHeight: 0.92, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.6rem', marginBottom: '0.75rem' }}>
                  A full month of ready-to-run sessions, <span style={{ color: 'var(--ember)' }}>free.</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem', lineHeight: 1.6, fontWeight: 300 }}>
                  Four print-ready sessions covering ball handling, defensive shape, attack structure, and a full run — with drill descriptions, timing, and coach notes built in.
                </p>
              </div>
              <div style={{ position: 'relative' }}>
                <DownloadForm />
              </div>
            </div>
          </section>
        )}

        {/* ── FINAL CTA ───────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg)', textAlign: 'center' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(50% - 50vw - 10vw)', width: 'max(0px, calc(50% - 470px))', background: 'var(--ember)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: 'calc(50% - 50vw - 10vw)', width: 'max(0px, calc(50% - 470px))', background: 'var(--ember)', transform: 'skewX(-12deg)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(232,86,10,0.14) 0%, transparent 60%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', maxWidth: '820px', margin: '0 auto', padding: 'clamp(6rem,11vw,9rem) clamp(1rem,3vw,2rem)' }}>
            <span className="section-label">Join the platform</span>
            <h2 className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: 'clamp(3.4rem,9vw,7.6rem)', lineHeight: 0.86, textTransform: 'uppercase', color: 'var(--text)', marginTop: '0.75rem', marginBottom: '1.5rem' }}>
              Ready to coach<br /><span style={{ color: 'var(--ember)' }}>smarter?</span>
            </h2>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.65, color: 'var(--text-secondary)', fontWeight: 300, marginBottom: '2.25rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
              Design better drills, plan smarter sessions and learn from coaches across the game. Free to start, two minutes to set up.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <Link href={user ? '/dashboard' : '/signup'} className="btn-angled btn-primary" style={{ fontSize: '1.2rem', padding: '18px 40px' }}>
                {user ? 'Go to dashboard' : 'Create free account'} →
              </Link>
              {!user && (
                <a href="#pricing" className="btn-angled btn-ghost" style={{ fontSize: '1.2rem', padding: '17px 34px' }}>
                  Compare plans
                </a>
              )}
            </div>
            {!user && (
              <p style={{ marginTop: '1.5rem', fontFamily: 'system-ui, sans-serif', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                No credit card required · Free forever plan · Built for rugby league coaches
              </p>
            )}
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────── */}
        <footer style={{ borderTop: '1px solid var(--hairline)', background: 'var(--surface)', padding: '2.5rem clamp(1rem,3vw,2rem)' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Image src="/logo.png" alt="18th Man" width={513} height={537} style={{ height: 30, width: 'auto', flexShrink: 0 }} />
              <span className="lp-display" style={{ fontWeight: 800, fontStyle: 'italic', fontSize: '1.05rem', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>18TH MAN</span>
            </div>
            <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
              {FOOTER_LINKS.map(({ label, href }) => (
                <Link key={label} href={href} className="footer-link">{label}</Link>
              ))}
            </div>
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              © {new Date().getFullYear()} 18th Man. Built for rugby league coaches.
            </p>
          </div>
        </footer>
      </div>

      {!user && <ExitIntentPopup />}
    </>
  )
}
