'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { getProductDownloadUrl } from '@/lib/shop-actions'

export function DownloadButton({ productId, label }: { productId: string; label: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    const result = await getProductDownloadUrl(productId)
    if (result.error || !result.url) {
      setError(result.error ?? 'Something went wrong')
      setLoading(false)
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full min-h-11 py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {loading ? 'Preparing…' : label}
      </button>
      {error && <p className="text-xs text-red-400 mt-1 text-center">{error}</p>}
    </div>
  )
}
