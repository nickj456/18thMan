'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TvMinimalPlay, Sparkles, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { generateDrillGuideFromYoutube, saveDrillYoutube } from '@/app/(app)/drills/youtube-actions'
import type { AiGuide } from '@/lib/supabase/types'

interface YoutubeImportProps {
  drillId: string
  existingUrl?: string | null
}

export function YoutubeImport({ drillId, existingUrl }: YoutubeImportProps) {
  const [url, setUrl] = useState(existingUrl ?? '')
  const [guide, setGuide] = useState<AiGuide | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isGenerating, startGenerating] = useTransition()
  const [isSaving, startSaving] = useTransition()

  function generate() {
    if (!url.trim()) return
    setError(null)
    setGuide(null)
    setSaved(false)

    startGenerating(async () => {
      const result = await generateDrillGuideFromYoutube(url)
      if (!result.success) {
        setError(result.error)
        return
      }
      setGuide(result.guide as AiGuide)
      // Auto-save
      startSaving(async () => {
        await saveDrillYoutube(drillId, url, result.guide, result.thumbnail)
        setSaved(true)
      })
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <TvMinimalPlay className="size-5 text-red-500" />
        <h3 className="font-semibold text-sm">YouTube Import</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Paste a YouTube URL to generate a coaching guide with AI
        </span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="yt-url" className="sr-only">YouTube URL</Label>
          <Input
            id="yt-url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
          />
        </div>
        <Button
          onClick={generate}
          disabled={!url.trim() || isGenerating || isSaving}
          size="sm"
          className="gap-2 shrink-0"
        >
          {isGenerating ? (
            <><Loader2 className="size-4 animate-spin" />Analysing…</>
          ) : (
            <><Sparkles className="size-4" />Generate guide</>
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {saved && guide && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle className="size-4" />
          Guide generated and saved successfully
        </div>
      )}

      {isSaving && !saved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Saving guide…
        </div>
      )}
    </div>
  )
}
