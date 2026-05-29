'use client'

import { Player } from '@remotion/player'
import { X } from 'lucide-react'
import { DrillAnimationComp, COMP_WIDTH, COMP_HEIGHT } from '@/components/designer/DrillAnimationComp'
import type { CanvasState } from '@/components/designer/types'

interface DrillAnimationModalProps {
  canvasJson: CanvasState
  drillTitle: string
  onClose: () => void
}

export function DrillAnimationModal({ canvasJson, drillTitle, onClose }: DrillAnimationModalProps) {
  const duration = canvasJson.duration ?? 90
  const kfCount = (canvasJson.keyframes ?? []).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: 940, maxWidth: '95vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-white">{drillTitle}</p>
            <p className="text-[11px] text-zinc-500">
              {kfCount} keyframes · {(duration / 30).toFixed(1)}s · 30fps
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
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
      </div>
    </div>
  )
}
