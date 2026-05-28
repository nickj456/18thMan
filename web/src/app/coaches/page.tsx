import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Barlow_Condensed } from 'next/font/google'
import { FeatureGrid } from './FeatureGrid'
import { QRExpand } from './QRExpand'

const barlow = Barlow_Condensed({
  weight: ['400', '600', '700', '800'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-barlow',
  display: 'swap',
})

export const metadata = { title: '18th Man — Join Tonight' }

const SIGNUP_URL = 'https://18thman.app/join/9b70bf9d-b648-48b7-acfc-2d67141993a2'

export default async function CoachesPage() {
  const qrDataUrl = await QRCode.toDataURL(SIGNUP_URL, {
    width: 280,
    margin: 2,
    color: { dark: '#ffffff', light: '#00000000' },
    errorCorrectionLevel: 'M',
  })

  return (
    <div
      className={barlow.variable}
      style={{
        minHeight: '100vh',
        background: '#07080d',
        color: '#e8e4dc',
        fontFamily: 'var(--font-barlow), system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        gap: '2.5rem',
      }}
    >
      {/* Logo + headline */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '1rem' }}>
          <Image src="/logo.png" alt="18th Man" width={48} height={48} />
          <span style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            18TH MAN
          </span>
        </div>
        <p style={{ fontSize: '1rem', color: '#7a7875', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
          Rugby League&apos;s Coaching Platform
        </p>
      </div>

      {/* QR + CTA */}
      <div style={{ textAlign: 'center' }}>
        <QRExpand dataUrl={qrDataUrl} />
        <p style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.1em', color: '#e8560a', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
          Scan to join free
        </p>
        <p style={{ fontSize: '0.9rem', color: '#4a4845', letterSpacing: '0.08em' }}>
          18thman.app/join/...
        </p>
      </div>

      {/* Feature grid */}
      <FeatureGrid />

      {/* CTA button */}
      <div style={{ textAlign: 'center' }}>
        <Link
          href="/signup"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#e8560a',
            color: '#fff',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '14px 40px',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          Sign Up Free →
        </Link>
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#4a4845', letterSpacing: '0.06em' }}>
          Free to join · Set up in 2 minutes · No card required
        </p>
      </div>

      {/* Social links */}
      <style>{`.social-link { display:flex; align-items:center; gap:8px; text-decoration:none; color:#4a4845; transition:color 0.15s; font-size:0.8rem; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; } .social-link:hover { color:#e8560a; }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <a href="https://www.facebook.com/18thMan/" target="_blank" rel="noopener noreferrer" className="social-link" style={{ flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span>Facebook</span>
          <span style={{ fontSize: '0.7rem', color: '#4a4845' }}>@18thMan</span>
        </a>

        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.08)' }} />

        <a href="https://www.instagram.com/18th.man/" target="_blank" rel="noopener noreferrer" className="social-link" style={{ flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          <span>Instagram</span>
          <span style={{ fontSize: '0.7rem', color: '#4a4845' }}>@18th.man</span>
        </a>
      </div>
    </div>
  )
}
