import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { login, loginWithOAuth } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string }>
}) {
  const { error, email } = await searchParams

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

        .auth-google-btn {
          width: 100%;
          background: #fff;
          color: #3c4043;
          font-size: 0.88rem;
          font-weight: 600;
          padding: 10px 0;
          border-radius: 8px;
          border: 1px solid #dadce0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .auth-google-btn:hover {
          background: #f8f9fa;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.25rem 0;
          color: #4a4845;
          font-size: 0.75rem;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.08);
        }

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

        .auth-forgot {
          font-size: 0.75rem;
          color: #7a7875;
          text-decoration: none;
          transition: color 0.15s;
        }
        .auth-forgot:hover { color: #e8e4dc; }

        .auth-field { margin-bottom: 1rem; }
        .auth-field-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
      `}</style>

      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your coaching account</p>

      {error && (
        <div className="auth-error">{decodeURIComponent(error)}</div>
      )}

      {/* Google sign-in */}
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

      <div className="auth-divider">or sign in with email</div>

      {/* Email/password form */}
      <form action={login}>
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="coach@club.com"
            defaultValue={email ? decodeURIComponent(email) : undefined}
            required
            className="auth-input"
          />
        </div>

        <div className="auth-field">
          <div className="auth-field-header">
            <label htmlFor="password" className="auth-label" style={{ marginBottom: 0 }}>Password</label>
            <Link href="/reset-password" className="auth-forgot">Forgot password?</Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            className="auth-input"
          />
        </div>

        <button type="submit" className="auth-btn-primary">Sign In</button>
      </form>

      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/signup">Create one free</Link>
      </p>
    </>
  )
}
