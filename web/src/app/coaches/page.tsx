import Link from 'next/link'
import Image from 'next/image'
import QRCode from 'qrcode'
import { Barlow_Condensed } from 'next/font/google'
import { FeatureGrid } from './FeatureGrid'

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
        <div
          style={{
            display: 'inline-block',
            padding: '1.25rem',
            background: 'rgba(232,86,10,0.08)',
            border: '2px solid rgba(232,86,10,0.3)',
            borderRadius: '20px',
            marginBottom: '1rem',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Scan to sign up" width={200} height={200} style={{ display: 'block' }} />
        </div>
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
    </div>
  )
}
