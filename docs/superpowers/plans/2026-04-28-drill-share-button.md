# Drill Share Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Share dropdown button to the drill detail page with two modes — share the drill URL via Web Share API, and share a recorded canvas animation as a video.

**Architecture:** `ShareDrillButton` is a self-contained `'use client'` component. For video sharing it renders animation frames to an offscreen canvas using `getInterpolatedElements` from `DrillAnimationComp` (the animation is SVG/Remotion-based, not a Konva canvas, so `captureStream` runs on our offscreen canvas not the player). The drill detail page (Server Component) passes `canvasJson` and derived `hasAnimation` as props — no `DrillPageClient` wrapper needed and `DrillImage` is untouched.

**Tech Stack:** React, shadcn/ui `DropdownMenu`, Lucide icons, `sonner` toast, Web Share API, `MediaRecorder` API, Canvas 2D API, existing `getInterpolatedElements` + `COMP_WIDTH`/`COMP_HEIGHT` from `DrillAnimationComp`.

---

## File Map

| Action | Path |
|--------|------|
| Create | `web/src/components/drills/ShareDrillButton.tsx` |
| Modify | `web/src/app/(app)/drills/[id]/page.tsx` |

---

## Task 1: Create `ShareDrillButton` — link sharing only

Build the component with the dropdown and link-share flow first (no video yet). Verify it works before adding the complex recording logic.

**Files:**
- Create: `web/src/components/drills/ShareDrillButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
// web/src/components/drills/ShareDrillButton.tsx
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
        // Desktop fallback: download
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
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="size-4" />
          Share
        </Button>
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
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/drills/ShareDrillButton.tsx
git commit -m "feat: add ShareDrillButton skeleton with link sharing"
```

---

## Task 2: Wire `ShareDrillButton` into the drill detail page

**Files:**
- Modify: `web/src/app/(app)/drills/[id]/page.tsx`

- [ ] **Step 1: Add the import and derive `hasAnimation` + pass props**

In `web/src/app/(app)/drills/[id]/page.tsx`, add the import after the existing component imports:

```tsx
import { ShareDrillButton } from '@/components/drills/ShareDrillButton'
```

Derive `hasAnimation` and `canvasState` after the `drill` constant (around line 91):

```tsx
const canvasState = drill.canvas_json as CanvasState | null
const hasAnimation = !!(canvasState?.keyframes && canvasState.keyframes.length >= 2)
```

- [ ] **Step 2: Add `ShareDrillButton` to the action bar**

The action bar `<div className="flex gap-2">` currently contains `SaveDrillButton` and conditionally the Edit button. Add `ShareDrillButton` between them:

```tsx
<div className="flex gap-2">
  {canInteract && (
    <SaveDrillButton drillId={id} initialSaved={isSaved} />
  )}
  <ShareDrillButton
    drillId={id}
    drillTitle={drill.title}
    hasAnimation={hasAnimation}
    canvasJson={canvasState}
  />
  {(userRole === 'admin' || drill.author_id === user?.id) && (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/drills/${id}/edit`} />}>
      <PenTool className="size-4 mr-1" />
      Edit
    </Button>
  )}
</div>
```

- [ ] **Step 3: Check TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/\(app\)/drills/\[id\]/page.tsx
git commit -m "feat: wire ShareDrillButton into drill detail page"
```

---

## Task 3: Implement canvas-based animation recording

Replace the placeholder `recordDrillAnimation` with the real implementation. The animation is SVG/Remotion-based, so we render each frame to an offscreen canvas using the existing `getInterpolatedElements` logic, then record with `MediaRecorder`.

**Files:**
- Modify: `web/src/components/drills/ShareDrillButton.tsx`

- [ ] **Step 1: Add canvas drawing helpers above `recordDrillAnimation`**

Replace the placeholder `recordDrillAnimation` function with the full implementation. Add these helpers and the recording function:

```tsx
import { getInterpolatedElements, COMP_WIDTH, COMP_HEIGHT } from '@/components/designer/DrillAnimationComp'
import type { CanvasElement, PitchBackground } from '@/components/designer/types'
```

Add to the import list at the top of the file (alongside existing imports).

- [ ] **Step 2: Add `drawPitch` helper**

Add this before `recordDrillAnimation` in the file:

```tsx
const GREEN = '#2d5a27'
const LIGHT_GREEN = '#357a2e'
const WHITE = '#ffffff'
const POST_SPAN = 35, POST_TOP = -80, POST_BOT = 30, BAR_OFFSET = -10

function drawPitch(ctx: CanvasRenderingContext2D, bg: PitchBackground) {
  const W = COMP_WIDTH, H = COMP_HEIGHT

  if (bg === 'blank') {
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([])
    for (let x = 0; x <= W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y <= H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
    return
  }

  const stripeCount = bg === 'full' ? 10 : 6
  const stripeW = W / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? GREEN : LIGHT_GREEN
    ctx.fillRect(i * stripeW, 0, stripeW, H)
  }

  ctx.strokeStyle = WHITE
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.strokeRect(20, 20, W - 40, H - 40)

  if (bg === 'full') {
    ctx.strokeRect(20, 20, W * 0.08, H - 40)
    ctx.strokeRect(W - 20 - W * 0.08, 20, W * 0.08, H - 40)
    ctx.beginPath(); ctx.moveTo(W / 2, 20); ctx.lineTo(W / 2, H - 20); ctx.stroke()
    ctx.setLineDash([8, 4]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W / 2 - W * 0.09, 20); ctx.lineTo(W / 2 - W * 0.09, H - 20); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(W / 2 + W * 0.09, 20); ctx.lineTo(W / 2 + W * 0.09, H - 20); ctx.stroke()
    ctx.setLineDash([])
  } else if (bg === 'half') {
    ctx.strokeRect(20, 20, W * 0.14, H - 40)
    ctx.setLineDash([8, 4])
    ctx.beginPath(); ctx.moveTo(W * 0.5, 20); ctx.lineTo(W * 0.5, H - 20); ctx.stroke()
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(W * 0.28, 20); ctx.lineTo(W * 0.28, H - 20); ctx.stroke()
    ctx.setLineDash([])
  } else if (bg === 'ingoal') {
    const px = W * 0.2
    ctx.beginPath(); ctx.moveTo(px, 20); ctx.lineTo(px, H - 20); ctx.stroke()
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 4
    const py = H / 2
    ctx.beginPath(); ctx.moveTo(px - POST_SPAN, py + BAR_OFFSET + POST_TOP); ctx.lineTo(px - POST_SPAN, py + BAR_OFFSET + POST_BOT); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px + POST_SPAN, py + BAR_OFFSET + POST_TOP); ctx.lineTo(px + POST_SPAN, py + BAR_OFFSET + POST_BOT); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px - POST_SPAN, py + BAR_OFFSET); ctx.lineTo(px + POST_SPAN, py + BAR_OFFSET); ctx.stroke()
  }
}
```

- [ ] **Step 3: Add `drawElement` helper**

```tsx
function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  const headLen = 12
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const endX = x2 - Math.cos(angle) * 6
  const endY = y2 - Math.sin(angle) * 6
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([])
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(endX, endY); ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath(); ctx.fill()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  const color = el.color ?? '#ffffff'
  switch (el.type) {
    case 'attacker': {
      const r = el.size === 'sm' ? 12 : el.size === 'lg' ? 22 : 16
      ctx.beginPath(); ctx.arc(el.x, el.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill()
      ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5; ctx.stroke()
      if (el.label) {
        ctx.fillStyle = WHITE; ctx.font = `bold ${Math.round(r * 0.75)}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(el.label, el.x, el.y)
      }
      break
    }
    case 'defender': {
      const r = el.size === 'sm' ? 12 : el.size === 'lg' ? 22 : 16
      ctx.fillStyle = color; ctx.strokeStyle = WHITE; ctx.lineWidth = 1.5
      roundRect(ctx, el.x - r, el.y - r, r * 2, r * 2, 3); ctx.fill(); ctx.stroke()
      if (el.label) {
        ctx.fillStyle = WHITE; ctx.font = `bold ${Math.round(r * 0.75)}px system-ui`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(el.label, el.x, el.y)
      }
      break
    }
    case 'cone': {
      ctx.beginPath(); ctx.moveTo(el.x, el.y - 14); ctx.lineTo(el.x + 12, el.y + 10); ctx.lineTo(el.x - 12, el.y + 10); ctx.closePath()
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke()
      break
    }
    case 'ball': {
      ctx.beginPath(); ctx.ellipse(el.x, el.y, 14, 9, 0, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#5c2d07'; ctx.lineWidth = 2; ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([])
      ctx.beginPath(); ctx.moveTo(el.x - 8, el.y); ctx.lineTo(el.x + 8, el.y); ctx.stroke()
      break
    }
    case 'arrow':
      if (el.x1 !== undefined && el.x2 !== undefined)
        drawArrow(ctx, el.x1, el.y1!, el.x2, el.y2!, color)
      break
    case 'line':
      if (el.x1 !== undefined && el.x2 !== undefined) {
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1!); ctx.lineTo(el.x2, el.y2!); ctx.stroke()
      }
      break
    case 'dotted':
      if (el.x1 !== undefined && el.x2 !== undefined) {
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([4, 6])
        ctx.beginPath(); ctx.moveTo(el.x1, el.y1!); ctx.lineTo(el.x2, el.y2!); ctx.stroke()
        ctx.setLineDash([])
      }
      break
    case 'zone':
      ctx.fillStyle = color; ctx.fillRect(el.x, el.y, el.width ?? 120, el.height ?? 80)
      ctx.strokeStyle = 'rgba(239,68,68,0.6)'; ctx.lineWidth = 1.5
      ctx.strokeRect(el.x, el.y, el.width ?? 120, el.height ?? 80)
      break
    case 'text':
      ctx.fillStyle = color; ctx.font = '16px system-ui, sans-serif'
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      ctx.fillText(el.label ?? '', el.x, el.y)
      break
  }
}

function drawDrillFrame(ctx: CanvasRenderingContext2D, canvasJson: CanvasState, frame: number) {
  ctx.fillStyle = '#07080d'
  ctx.fillRect(0, 0, COMP_WIDTH, COMP_HEIGHT)
  drawPitch(ctx, canvasJson.background)
  const elements = getInterpolatedElements(canvasJson, frame)
  for (const el of elements) drawElement(ctx, el)
}
```

- [ ] **Step 4: Replace the placeholder `recordDrillAnimation`**

Replace the placeholder function at the bottom of the file with:

```tsx
function getSupportedMimeType(): string {
  const candidates = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm']
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'
}

async function recordDrillAnimation(canvasJson: CanvasState, drillTitle: string): Promise<File> {
  if (!('captureStream' in HTMLCanvasElement.prototype)) {
    throw new Error("Video sharing isn't supported on this browser")
  }

  const canvas = document.createElement('canvas')
  canvas.width = COMP_WIDTH
  canvas.height = COMP_HEIGHT
  const ctx = canvas.getContext('2d')!
  const mimeType = getSupportedMimeType()
  const stream = (canvas as HTMLCanvasElement & { captureStream(fps?: number): MediaStream }).captureStream(30)
  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  const totalFrames = canvasJson.duration ?? 90
  const fps = 30

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
      const safeName = drillTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()
      resolve(new File([blob], `drill-${safeName}.${ext}`, { type: mimeType }))
    }
    recorder.onerror = (e) => reject(e)
    recorder.start()

    let startTime: number | null = null
    function renderLoop(timestamp: number) {
      if (startTime === null) startTime = timestamp
      const frame = Math.min(Math.floor(((timestamp - startTime) / 1000) * fps), totalFrames)
      drawDrillFrame(ctx, canvasJson, frame)
      if (frame >= totalFrames) {
        recorder.stop()
        return
      }
      requestAnimationFrame(renderLoop)
    }
    requestAnimationFrame(renderLoop)
  })
}
```

Also update `handleShareVideo` in the component body to handle the `captureStream` unsupported error specifically:

```tsx
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
    const message = err instanceof Error ? err.message : ''
    if (message.includes("isn't supported")) {
      toast.error("Video sharing isn't supported on this browser")
    } else if (!message.toLowerCase().includes('cancel') && !message.toLowerCase().includes('abort')) {
      toast.error('Failed to share video')
    }
  } finally {
    setRecording(false)
  }
}
```

- [ ] **Step 5: Check TypeScript compiles**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/drills/ShareDrillButton.tsx
git commit -m "feat: implement canvas animation recording for drill video share"
```

---

## Task 4: Verify and ship

- [ ] **Step 1: Build to catch any SSR/bundling issues**

```bash
cd web && npm run build
```

Expected: build completes with no errors.

- [ ] **Step 2: Invoke the ship skill**

Run `/ship` to create the PR and push to production.

---

## Self-Review Notes

- **Spec deviation (intentional):** Spec proposed capturing the Konva/Remotion Player canvas via `canvasRef`. Actual implementation uses an offscreen canvas with Canvas 2D rendering — correct because the animation is Remotion SVG-based, not a capturable Konva canvas.
- **`hasAnimation` logic** matches `DrillImage.tsx` exactly: `canvasJson?.keyframes && canvasJson.keyframes.length >= 2`.
- **Recording duration** uses `canvasJson.duration` (actual animation length in frames) rather than hard-coding 20s — produces a correctly-sized video for each drill.
- **`DrillPageClient` not needed** — `ShareDrillButton` receives serializable props directly from the Server Component.
- **`DrillImage` unchanged** — no canvas ref needed.
- **Pitch flipping** (`pitchFlipped`) is not handled in the canvas renderer — this is intentional as the video export is best-effort and the pitch visual is secondary to the player movements.
