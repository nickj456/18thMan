'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { CheckoutPlan } from '@/lib/stripe'

interface CheckoutButtonProps {
  plan: CheckoutPlan
  clubId?: string | null
  label: string
  variant: 'primary' | 'amber' | 'secondary'
}

const variantClasses = {
  primary: 'bg-indigo-500 hover:bg-indigo-400 text-white',
  amber: 'bg-amber-500 hover:bg-amber-400 text-black',
  secondary: 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white',
}

export function CheckoutButton({ plan, clubId, label, variant }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, clubId }),
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
        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : label}
      </button>
      {error && <p className="text-[10px] text-red-400 mt-1 text-center">{error}</p>}
    </div>
  )
}
