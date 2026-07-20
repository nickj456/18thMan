'use client'

import { useState } from 'react'
import { Loader2, ShoppingCart } from 'lucide-react'

export function BuyButton({ productId, priceLabel }: { productId: string; priceLabel: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/shop-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
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
        className="w-full min-h-11 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />}
        {loading ? 'Redirecting…' : `Buy for ${priceLabel}`}
      </button>
      {error && <p className="text-xs text-red-400 mt-1 text-center">{error}</p>}
    </div>
  )
}
