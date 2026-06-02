import React, { useState } from 'react'
import { signIn } from '../utils/authClient'
import logoUrl from '../../assets/logo.png'

export default function LoginScreen({ onSuccess, initialError = null }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(initialError)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn(email.trim(), password)
    setLoading(false)
    if (result.error === 'no-subscription') {
      setError('upgrade')
    } else if (result.error) {
      setError(result.error)
    } else {
      onSuccess(result)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10000,
      // Allow dragging the window via the background
      WebkitAppRegion: 'drag',
    }}>
      {/* Window controls area */}
      <div style={{
        position: 'absolute', top: 0, right: 0, height: 44,
        display: 'flex', alignItems: 'center',
        WebkitAppRegion: 'no-drag',
      }}>
        <WinBtn onClick={() => window.electron?.minimizeWindow()}>—</WinBtn>
        <WinBtn onClick={() => window.electron?.closeWindow()} danger>✕</WinBtn>
      </div>

      <div style={{
        width: 360, WebkitAppRegion: 'no-drag',
      }}>
        {/* Logo + title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src={logoUrl}
            alt="18th Man"
            style={{ height: 64, objectFit: 'contain', display: 'block', margin: '0 auto 16px' }}
            onError={e => e.target.style.display = 'none'}
          />
          <div style={{
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
            fontSize: 26, color: 'var(--brand)', letterSpacing: 0.5,
          }}>
            18th Man
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
            letterSpacing: 2.5, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4,
          }}>
            Match Analyst
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 5, padding: '28px 28px 24px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13,
            color: 'var(--text)', marginBottom: 20, letterSpacing: 0.2,
          }}>
            Sign in with your 18thMan account
          </div>

          {error === 'upgrade' ? (
            <UpgradePrompt onBack={() => setError(null)} />
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <Label>Email</Label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  style={{ width: '100%', marginTop: 5 }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <Label>Password</Label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ width: '100%', marginTop: 5 }}
                />
              </div>

              {error && error !== 'upgrade' && (
                <div style={{
                  background: 'rgba(163,45,45,0.12)', border: '1px solid var(--red)',
                  borderRadius: 3, padding: '8px 12px', marginBottom: 14,
                  fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--red)',
                }}>
                  {error.includes('Invalid') || error.includes('credentials') || error.includes('password')
                    ? 'Incorrect email or password. Please try again.'
                    : error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: loading ? 'var(--brand-dim)' : 'var(--brand)',
                  color: '#fff', border: 'none', padding: '11px 0', borderRadius: 3,
                  fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800,
                  letterSpacing: 0.8, textTransform: 'uppercase',
                  cursor: loading ? 'wait' : 'pointer', transition: 'background 0.1s',
                }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); window.electron?.openExternal('https://18thman.app/reset-password') }}
                  style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Forgot password?
                </a>
              </div>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted-2)' }}>
            No account?{' '}
          </span>
          <a
            href="#"
            onClick={e => { e.preventDefault(); window.electron?.openExternal('https://18thman.app') }}
            style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--brand)', cursor: 'pointer' }}
          >
            Sign up at 18thman.app
          </a>
        </div>
      </div>
    </div>
  )
}

function UpgradePrompt({ onBack }) {
  return (
    <div>
      <div style={{
        background: 'rgba(232,86,10,0.08)', border: '1px solid rgba(232,86,10,0.3)',
        borderRadius: 3, padding: '12px 14px', marginBottom: 16,
        fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', lineHeight: 1.7,
      }}>
        <strong style={{ color: 'var(--brand)' }}>Subscription required</strong><br />
        18th Man Match Analyst requires a <strong>Coach</strong> or <strong>Club</strong> plan.
        Your current account is on the free tier.
      </div>
      <button
        onClick={() => window.electron?.openExternal('https://18thman.app/pricing')}
        style={{
          width: '100%', background: 'var(--brand)', color: '#fff', border: 'none',
          padding: '10px 0', borderRadius: 3, marginBottom: 10,
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
          letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
        }}
      >
        Upgrade at 18thman.app →
      </button>
      <button
        onClick={onBack}
        style={{
          width: '100%', background: 'transparent', color: 'var(--muted)',
          border: '1px solid var(--border)', padding: '8px 0', borderRadius: 3,
          fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        Back to sign in
      </button>
    </div>
  )
}

function Label({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
      letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function WinBtn({ onClick, children, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 46, height: 44, border: 'none', cursor: 'pointer',
        background: danger && hov ? '#c42b1c' : hov ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: hov ? '#fff' : 'var(--muted)',
        fontFamily: 'var(--font-ui)', fontSize: 14,
      }}
    >
      {children}
    </button>
  )
}
