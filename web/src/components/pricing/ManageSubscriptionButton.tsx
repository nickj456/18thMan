'use client'

import { useState } from 'react'
import { Loader2, ExternalLink } from 'lucide-react'

interface ManageSubscriptionButtonProps {
  clubId?: string | null
}

export function ManageSubscriptionButton({ clubId }: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clubId: clubId ?? undefined }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />}
      Manage billing
    </button>
  )
}
