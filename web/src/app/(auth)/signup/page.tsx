import Link from 'next/link'
import { signup } from './actions'

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

        <button type="submit" className="auth-btn-primary">Create Account</button>
      </form>

      <p className="auth-footer">
        Already have an account?{' '}
        <Link href="/login">Sign in</Link>
      </p>
    </>
  )
}
