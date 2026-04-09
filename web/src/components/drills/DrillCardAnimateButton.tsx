'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { DrillAnimationModal } from '@/components/drills/DrillAnimationModal'
import type { CanvasState } from '@/components/designer/types'

interface DrillCardAnimateButtonProps {
  canvasJson: CanvasState
  title: string
}

export function DrillCardAnimateButton({ canvasJson, title }: DrillCardAnimateButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Play animation: ${title}`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="rounded-full bg-indigo-600/80 p-3 backdrop-blur-sm shadow-lg">
            <Play size={28} className="text-white fill-white" />
          </div>
          <span className="text-[11px] font-semibold text-white/90 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
            Play Animation
          </span>
        </div>
      </button>
      {open && (
        <DrillAnimationModal
          canvasJson={canvasJson}
          drillTitle={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
