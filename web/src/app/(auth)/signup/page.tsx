import Link from 'next/link'
import { signup } from './actions'
import { loginWithOAuth } from '@/app/(auth)/login/actions'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error, success } = await searchParams

  if (success === 'check-email') {
    return (
      <div style={{ textAlign: 'center' }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(232,86,10,0.12)',
          border: '1px solid rgba(232,86,10,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e8560a" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-barlow-auth)', fontWeight: 800, fontSize: '1.6rem', color: '#e8e4dc', marginBottom: '0.5rem' }}>
          Check your email
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#7a7875', lineHeight: 1.7, marginBottom: '0.5rem' }}>
          We&apos;ve sent a confirmation link to your inbox.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#7a7875', lineHeight: 1.7, marginBottom: '1.75rem' }}>
          Click the link in the email to activate your account and start coaching.
        </p>

        <div style={{ fontSize: '0.8rem', color: '#4a4845', lineHeight: 1.8 }}>
          <p>Didn&apos;t get it? Check your spam folder.</p>
          <p>
            Already confirmed?{' '}
            <Link href="/login" style={{ color: '#e8560a', fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        .auth-title {
          font-family: var(--font-barlow-auth), system-ui, sans-serif;
          font-weight: 800;
          font-size: 1.75rem;
          letter-spacing: 0.01em;
          color: #e8e4dc;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          font-size: 0.875rem;
          color: #7a7875;
          margin-bottom: 1.75rem;
        }
        .auth-label {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #9a9691;
          margin-bottom: 6px;
        }
        .auth-input {
          width: 100%;
          background: rgba(255,255,255,0.04) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          color: #e8e4dc !important;
          font-size: 0.9rem !important;
          padding: 10px 12px !important;
          transition: border-color 0.15s !important;
          outline: none !important;
        }
        .auth-input:focus {
          border-color: rgba(232,86,10,0.5) !important;
          box-shadow: 0 0 0 3px rgba(232,86,10,0.08) !important;
        }
        .auth-input::placeholder {
          color: #4a4845 !important;
        }
        .auth-btn-primary {
          width: 100%;
          background: #e8560a;
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.04em;
          padding: 11px 0;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .auth-btn-primary:hover { background: #c8490a; transform: translateY(-1px); }
        .auth-btn-primary:active { transform: translateY(0); }

        .auth-error {
          font-size: 0.82rem;
          color: #ef4444;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 1rem;
        }

        .auth-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.82rem;
          color: #7a7875;
        }
        .auth-footer a {
          color: #e8e4dc;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }
        .auth-footer a:hover { color: #e8560a; }

        .auth-field { margin-bottom: 1rem; }
        .auth-hint {
          font-size: 0.72rem;
          color: #4a4845;
          margin-top: 4px;
        }
      `}</style>

      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Join the 18th Man coaching community</p>

      {error && (
        <div className="auth-error">{decodeURIComponent(error)}</div>
      )}

      {/* OAuth buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
        <form action={loginWithOAuth.bind(null, 'google')}>
          <button type="submit" className="auth-google-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </form>
        <form action={loginWithOAuth.bind(null, 'facebook')}>
          <button type="submit" className="auth-google-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </form>
      </div>

      <div className="auth-divider">or create with email</div>

      <form action={signup}>
        <div className="auth-field">
          <label htmlFor="username" className="auth-label">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="coachsmith"
            pattern="[a-z0-9_-]+"
            title="Lowercase letters, numbers, hyphens and underscores only"
            required
            className="auth-input"
          />
          <p className="auth-hint">Lowercase letters, numbers, hyphens and underscores</p>
        </div>

        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="coach@club.com"
            required
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            minLength={8}
            required
            className="auth-input"
          />
          <p className="auth-hint">Minimum 8 characters</p>
        </div>

        <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            style={{
              marginTop: '2px',
              width: 15,
              height: 15,
              flexShrink: 0,
              accentColor: '#e8560a',
              cursor: 'pointer',
            }}
          />
          <label htmlFor="terms" style={{ fontSize: '0.78rem', color: '#7a7875', lineHeight: 1.5, cursor: 'pointer' }}>
            I agree to the{' '}
            <Link href="/legal/terms" target="_blank" style={{ color: '#e8e4dc', textDecoration: 'underline' }}>
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/legal/privacy" target="_blank" style={{ color: '#e8e4dc', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
          </label>
        </div>

        <button type="submit" className="auth-btn-primary">Create Account</button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </>
  )
}
