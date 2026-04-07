import Link from 'next/link'
import Image from 'next/image'
import { Barlow_Condensed } from 'next/font/google'

const barlow = Barlow_Condensed({
  weight: ['700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-barlow-auth',
  display: 'swap',
})

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .auth-bg {
          background: #07080d;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          position: relative;
          overflow: hidden;
        }

        .auth-pitch {
          position: absolute;
          inset: 0;
          opacity: 0.022;
          pointer-events: none;
        }

        .auth-glow-1 {
          position: absolute;
          top: -200px;
          right: -100px;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(232,86,10,0.1) 0%, transparent 65%);
          pointer-events: none;
        }

        .auth-glow-2 {
          position: absolute;
          bottom: -150px;
          left: -100px;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 65%);
          pointer-events: none;
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          position: relative;
          z-index: 1;
        }

        .auth-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          margin-bottom: 2rem;
          justify-content: center;
        }

        .auth-logo-mark {
          width: 44px;
          height: 44px;
          flex-shrink: 0;
        }

        .auth-logo-text {
          font-family: var(--font-barlow-auth), system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: 0.06em;
          color: #e8e4dc;
        }

        .auth-panel {
          background: #0d0f16;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 2.25rem;
          box-shadow:
            0 0 0 1px rgba(0,0,0,0.4),
            0 32px 64px rgba(0,0,0,0.4),
            0 0 80px rgba(232,86,10,0.04);
        }
      `}</style>

      <div className={`${barlow.variable} auth-bg`}>
        {/* Pitch grid */}
        <svg
          className="auth-pitch"
          viewBox="0 0 680 1000"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <rect x="20" y="20" width="640" height="960" stroke="white" strokeWidth="2" />
          <line x1="20" y1="100" x2="660" y2="100" stroke="white" strokeWidth="1.5" />
          <line x1="20" y1="900" x2="660" y2="900" stroke="white" strokeWidth="1.5" />
          <line x1="20" y1="196" x2="660" y2="196" stroke="white" strokeWidth="1" />
          <line x1="20" y1="804" x2="660" y2="804" stroke="white" strokeWidth="1" />
          <line x1="20" y1="292" x2="660" y2="292" stroke="white" strokeWidth="1" />
          <line x1="20" y1="708" x2="660" y2="708" stroke="white" strokeWidth="1" />
          <line x1="20" y1="404" x2="660" y2="404" stroke="white" strokeWidth="1" />
          <line x1="20" y1="596" x2="660" y2="596" stroke="white" strokeWidth="1" />
          <line x1="20" y1="500" x2="660" y2="500" stroke="white" strokeWidth="1.5" />
          <circle cx="340" cy="500" r="4" fill="white" />
          <line x1="310" y1="20" x2="310" y2="70" stroke="white" strokeWidth="2" />
          <line x1="370" y1="20" x2="370" y2="70" stroke="white" strokeWidth="2" />
          <line x1="310" y1="48" x2="370" y2="48" stroke="white" strokeWidth="2" />
          <line x1="340" y1="48" x2="340" y2="100" stroke="white" strokeWidth="1.5" />
          <line x1="310" y1="980" x2="310" y2="930" stroke="white" strokeWidth="2" />
          <line x1="370" y1="980" x2="370" y2="930" stroke="white" strokeWidth="2" />
          <line x1="310" y1="952" x2="370" y2="952" stroke="white" strokeWidth="2" />
          <line x1="340" y1="952" x2="340" y2="900" stroke="white" strokeWidth="1.5" />
        </svg>

        <div className="auth-glow-1" />
        <div className="auth-glow-2" />

        <div className="auth-card">
          {/* Logo */}
          <Link href="/" className="auth-logo">
            <Image src="/logo.png" alt="18th Man" width={44} height={44} className="auth-logo-mark" />
            <span className="auth-logo-text">18TH MAN</span>
          </Link>

          {/* Card */}
          <div className="auth-panel">
            {children}
          </div>

          {/* Legal footer */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.72rem', color: '#3a3835' }}>
            <a href="/legal/terms" style={{ color: '#3a3835', textDecoration: 'none' }} onMouseOver={e => (e.currentTarget.style.color = '#7a7875')} onMouseOut={e => (e.currentTarget.style.color = '#3a3835')}>Terms</a>
            {' · '}
            <a href="/legal/privacy" style={{ color: '#3a3835', textDecoration: 'none' }} onMouseOver={e => (e.currentTarget.style.color = '#7a7875')} onMouseOut={e => (e.currentTarget.style.color = '#3a3835')}>Privacy</a>
          </div>
        </div>
      </div>
    </>
  )
}
