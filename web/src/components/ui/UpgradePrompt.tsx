'use client'

import Link from 'next/link'
import { Lock, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

interface UpgradePromptProps {
  feature: string
  description?: string
  /** If true, renders as a dismissible modal overlay */
  modal?: boolean
  onDismiss?: () => void
}

/**
 * Inline upgrade prompt — shown when a free-tier user tries to access a gated feature.
 * Pass modal=true to wrap it in a full-screen overlay.
 */
export function UpgradePrompt({ feature, description, modal, onDismiss }: UpgradePromptProps) {
  const card = (
    <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 space-y-4">
      {modal && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
          <Lock size={16} className="text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-white">{feature} is a club feature</h3>
          <p className="text-sm text-zinc-400 mt-0.5">
            {description ?? `${feature} is available on the club subscription. Upgrade to unlock it for your whole coaching staff.`}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium transition-colors"
        >
          <Sparkles size={13} />
          See club plans
        </Link>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 text-sm transition-colors"
          >
            Maybe later
          </button>
        )}
      </div>
    </div>
  )

  if (!modal) return card

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md">
        {card}
      </div>
    </div>
  )
}

/**
 * Hook to manage upgrade prompt visibility triggered by a server action error.
 * Returns a show flag, a handler to call with the error string, and a dismiss fn.
 */
export function useUpgradePrompt() {
  const [show, setShow] = useState(false)

  function checkError(error: string | undefined) {
    if (error?.includes('Upgrade') || error?.includes('club subscription')) {
      setShow(true)
      return true
    }
    return false
  }

  return { show, checkError, dismiss: () => setShow(false) }
}
