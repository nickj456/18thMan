'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { CheckoutPlan } from '@/lib/stripe'

interface ClubCheckoutButtonProps {
  plan: CheckoutPlan
  label: string
  variant: 'amber' | 'secondary'
}

const variantStyles: Record<string, React.CSSProperties> = {
  amber: { background: '#f59e0b', color: '#000', fontWeight: 700 },
  secondary: { border: '1px solid #3f3f46', color: '#a1a1aa', background: 'transparent' },
}

export function ClubCheckoutButton({ plan, label, variant }: ClubCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/club-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: '100%',
          padding: '9px 0',
          borderRadius: 8,
          fontSize: 13,
          textAlign: 'center',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          ...variantStyles[variant],
        }}
      >
        {loading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : label}
      </button>
      {error && <p style={{ fontSize: 10, color: '#f87171', marginTop: 4, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}
