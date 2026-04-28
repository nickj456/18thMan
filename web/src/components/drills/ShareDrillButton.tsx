'use client'

import { useState } from 'react'
import { Share2, Link, Video, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CanvasState } from '@/components/designer/types'

interface ShareDrillButtonProps {
  drillId: string
  drillTitle: string
  hasAnimation: boolean
  canvasJson: CanvasState | null
}

export function ShareDrillButton({ drillId, drillTitle, hasAnimation, canvasJson }: ShareDrillButtonProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [recording, setRecording] = useState(false)

  const url = `${typeof window !== 'undefined' ? window.location.origin : 'https://18thman.app'}/drills/${drillId}`

  async function handleShareLink() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: drillTitle,
          text: 'Check out this rugby league drill on 18th Man',
          url,
        })
      } catch {
        // User cancelled — not an error
      }
    } else {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  async function handleShareVideo() {
    if (!canvasJson) return
    setRecording(true)
    try {
      const file = await recordDrillAnimation(canvasJson, drillTitle)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: drillTitle })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(file)
        a.download = file.name
        a.click()
        URL.revokeObjectURL(a.href)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (!message.includes('cancel') && !message.includes('abort')) {
        toast.error('Failed to share video')
      }
    } finally {
      setRecording(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
        <Share2 className="size-4" />
        Share
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleShareLink} className="gap-2">
          {linkCopied ? <Check className="size-4 text-emerald-400" /> : <Link className="size-4" />}
          {linkCopied ? 'Link copied!' : 'Share drill'}
        </DropdownMenuItem>
        {hasAnimation && (
          <DropdownMenuItem
            onClick={handleShareVideo}
            disabled={recording}
            className="gap-2"
          >
            {recording ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
            {recording ? 'Generating video…' : 'Share video'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// --- placeholder so the file compiles ---
async function recordDrillAnimation(_canvasJson: CanvasState, _drillTitle: string): Promise<File> {
  throw new Error('Not implemented yet')
}
