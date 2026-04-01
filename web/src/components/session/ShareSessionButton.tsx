'use client'

import { useState, useTransition } from 'react'
import { Link2, Copy, Check, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateShareLink, revokeShareLink } from '@/app/(app)/sessions/share-actions'

interface Props {
  sessionId: string
  existingToken: string | null
}

export function ShareSessionButton({ sessionId, existingToken }: Props) {
  const [token, setToken] = useState<string | null>(existingToken)
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const shareUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/sessions/share/${token}`
    : null

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateShareLink(sessionId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setToken(result.token)
      setOpen(true)
    })
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copied to clipboard')
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeShareLink(sessionId)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      setToken(null)
      setOpen(false)
      toast.success('Share link revoked')
    })
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={token ? () => setOpen(v => !v) : handleGenerate}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-3.5 mr-1.5 animate-spin" />
        ) : (
          <Link2 className="size-3.5 mr-1.5" />
        )}
        {token ? 'Share link' : 'Create share link'}
      </Button>

      {open && shareUrl && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Popover */}
          <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-white mb-1">Share link</p>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view the session — no login required.
              </p>
            </div>

            {/* URL row */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-800 border border-zinc-700">
              <span className="flex-1 text-xs text-zinc-300 truncate font-mono">
                {shareUrl}
              </span>
              <button
                onClick={handleCopy}
                className="text-zinc-400 hover:text-white transition-colors shrink-0"
                title="Copy link"
              >
                {copied ? (
                  <Check className="size-4 text-green-400" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>

            {/* Revoke */}
            <button
              onClick={handleRevoke}
              disabled={isPending}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Revoke link
            </button>
          </div>
        </>
      )}
    </div>
  )
}
