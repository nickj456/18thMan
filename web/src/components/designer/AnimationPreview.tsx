'use client'

import { Player } from '@remotion/player'
import type { CanvasState } from './types'
import { DrillAnimationComp, COMP_WIDTH, COMP_HEIGHT } from './DrillAnimationComp'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AnimationPreviewProps {
  canvasJson: CanvasState
  drillTitle?: string
  onClose: () => void
}

export function AnimationPreview({ canvasJson, drillTitle, onClose }: AnimationPreviewProps) {
  const duration = canvasJson.duration ?? 90
  const keyframes = (canvasJson.keyframes ?? []).length

  return (
    // The shared Dialog brings focus trapping, Escape-to-close, backdrop click
    // and a labelled close button, which the hand-rolled overlay lacked.
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[940px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[95vw]">
        <DialogHeader className="border-b border-border px-4 py-3 pr-12 text-left">
          <DialogTitle className="text-sm font-semibold">{drillTitle ?? 'Drill animation'}</DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground tabular-nums">
            {keyframes} keyframe{keyframes !== 1 ? 's' : ''} · {(duration / 30).toFixed(1)}s · 30fps
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center bg-background p-4">
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
      </DialogContent>
    </Dialog>
  )
}
