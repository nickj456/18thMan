'use client'

import { useCallback, useState } from 'react'
import { Player } from '@remotion/player'
import { X, Download, Loader2, Check } from 'lucide-react'
import type { CanvasState } from './types'
import { DrillAnimationComp, COMP_WIDTH, COMP_HEIGHT } from './DrillAnimationComp'

interface AnimationPreviewProps {
  canvasJson: CanvasState
  drillTitle?: string
  onClose: () => void
}

const isLocalDev = process.env.NODE_ENV === 'development'

export function AnimationPreview({ canvasJson, drillTitle, onClose }: AnimationPreviewProps) {
  const [rendering, setRendering] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const duration = canvasJson.duration ?? 90
  const slug = (drillTitle ?? 'drill').replace(/\s+/g, '-').toLowerCase()

  const handleDownload = useCallback(async () => {
    setRendering(true)
    setError(null)
    setDone(false)
    try {
      const res = await fetch('/api/drills/render-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvasJson, drillTitle }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Server error ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-animation.mp4`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render failed')
    } finally {
      setRendering(false)
    }
  }, [canvasJson, drillTitle, slug])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 940, maxWidth: '95vw' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-white">{drillTitle ?? 'Drill Animation'}</p>
            <p className="text-[11px] text-zinc-500">
              {(canvasJson.keyframes ?? []).length} keyframes · {(duration / 30).toFixed(1)}s · 30fps
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLocalDev ? (
              <button
                onClick={handleDownload}
                disabled={rendering}
                className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg transition-colors border disabled:opacity-60 disabled:cursor-not-allowed ${
                  done
                    ? 'bg-green-500/15 text-green-400 border-green-500/20'
                    : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:text-amber-300 border-amber-500/20'
                }`}
              >
                {rendering ? <Loader2 size={12} className="animate-spin" /> : done ? <Check size={12} /> : <Download size={12} />}
                {rendering ? 'Rendering…' : done ? 'Downloaded!' : 'Download MP4'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-600 cursor-default">
                <Download size={12} />
                MP4 export coming soon
              </span>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Player */}
        <div className="p-4 flex items-center justify-center bg-zinc-950">
          <Player
            component={DrillAnimationComp}
            inputProps={{ canvasJson, drillTitle }}
            durationInFrames={duration}
            compositionWidth={COMP_WIDTH}
            compositionHeight={COMP_HEIGHT}
            fps={30}
            style={{ width: '100%', maxWidth: 900 }}
            controls
            loop
            autoPlay
          />
        </div>

        {/* Status bar */}
        {(error || rendering) && (
          <div className={`px-4 py-2.5 border-t border-zinc-800 text-[11px] ${error ? 'text-red-400 bg-red-400/5' : 'text-zinc-500 bg-zinc-900/50'}`}>
            {error ? `Error: ${error}` : 'Rendering — this takes around 10–30 seconds the first time while the compositor warms up…'}
          </div>
        )}
      </div>
    </div>
  )
}
