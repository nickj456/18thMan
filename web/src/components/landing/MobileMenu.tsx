'use client'

import { useState } from 'react'
import Link from 'next/link'

const SECTION_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Community', href: '#community' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Services', href: '#services' },
]

export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <div className="mobile-nav-panel">
          {SECTION_LINKS.map(({ label, href }) => (
            <a key={href} href={href} className="mobile-nav-item" onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
          <Link href="/analyst" className="mobile-nav-item" onClick={() => setOpen(false)}>
            Analyst
          </Link>
          {signedIn ? (
            <Link href="/dashboard" className="mobile-nav-item mobile-nav-item-accent" onClick={() => setOpen(false)}>
              Go to App →
            </Link>
          ) : (
            <Link href="/login" className="mobile-nav-item mobile-nav-item-accent" onClick={() => setOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      )}
    </>
  )
}
