# Drill Share Button — Design Spec

**Date:** 2026-04-28
**Status:** Approved

---

## Overview

Add a Share button to the drill detail page that lets users share drills externally. Two share modes:

1. **Share drill** — shares the drill URL via the Web Share API (native share sheet on mobile; copy-to-clipboard fallback on desktop)
2. **Share video** — records the 20-second canvas animation and shares it as an MP4 via the Web Share API (download fallback on desktop)

The shared link drives recipients to the drill detail page in the app, where full Open Graph metadata (title, description, preview image) ensures rich link previews on every platform.

---

## UI

### Placement

`ShareDrillButton` sits in the existing action bar on the drill detail page, between the Save button and the Edit button.

### Behaviour

- Renders as a `Button` with a `Share2` icon and "Share" label
- Clicking opens a shadcn `DropdownMenu` with up to two items:
  - **Share drill** — always present. Icon: `Link`. Copies/shares the drill URL.
  - **Share video** — only rendered when `hasAnimation` is true (drill has animated canvas elements). Icon: `Video`.
- After "Share drill" succeeds on desktop fallback, the button icon briefly flips to a checkmark with "Link copied" label, then resets
- While video is recording, "Share video" shows a spinner and "Generating video…" and is disabled
- The dropdown closes after either action completes or on error

---

## Link Sharing

Calls `navigator.share()` with:

```ts
{
  title: drillTitle,
  text: `Check out this rugby league drill on 18th Man`,
  url: `https://18thman.app/drills/${drillId}`,
}
```

The drill detail page already has complete Open Graph and Twitter Card metadata, so the shared link renders a rich preview (image, title, description) automatically on WhatsApp, iMessage, Twitter, Facebook, etc.

**Desktop fallback:** if `navigator.share` is not available, falls back to `navigator.clipboard.writeText(url)` and shows the "Link copied" confirmation.

No server action or API route required — entirely client-side.

---

## Video Recording & Sharing

### When shown

`hasAnimation` is derived server-side from `canvas_json`: true if the JSON contains any elements with animation keyframes (i.e. `canvas_json.elements` contains at least one entry where `animations` is a non-empty array). Passed as a prop to `ShareDrillButton`.

### Recording flow

1. Access the Konva canvas `HTMLCanvasElement` via a `canvasRef` prop
2. Call `canvas.captureStream(30)` — 30fps `MediaStream`
3. Create a `MediaRecorder` instance with `video/mp4` (falling back to `video/webm` if MP4 is unsupported)
4. Record for **20 seconds** — matching the maximum canvas animation duration in the app
5. On `stop`, collect chunks into a `Blob` and wrap as a `File` (`drill-{title}.mp4`)
6. Call `navigator.share({ files: [videoFile], title: drillTitle })`

**Desktop fallback:** if `navigator.canShare?.({ files })` returns false, trigger a browser download of the video file instead.

### Error handling

- If `canvas.captureStream` is unavailable (Safari < 16), show a toast: "Video sharing isn't supported on this browser"
- If `MediaRecorder` fails to start, show a toast: "Failed to record video"
- User can cancel recording by closing the dropdown; the `MediaRecorder` is stopped and the blob is discarded

---

## Component Structure

### New components

**`ShareDrillButton`** (`web/src/components/drills/ShareDrillButton.tsx`)
- `'use client'`
- Props: `drillId: string`, `drillTitle: string`, `hasAnimation: boolean`, `canvasRef: React.RefObject<HTMLCanvasElement | null>`
- Owns all share logic — no server actions

**`DrillPageClient`** (`web/src/components/drills/DrillPageClient.tsx`)
- `'use client'`
- Thin wrapper that owns the `canvasRef` (`useRef<HTMLCanvasElement | null>(null)`)
- Renders `DrillImage` (passing `canvasRef`) and `ShareDrillButton` (passing `canvasRef`)
- Keeps `drills/[id]/page.tsx` as a pure Server Component

### Modified components

**`DrillImage`** (`web/src/components/drills/DrillImage.tsx`)
- Accepts optional `canvasRef?: React.RefObject<HTMLCanvasElement | null>`
- On Konva stage mount, resolves the underlying `HTMLCanvasElement` from the stage and assigns it to `canvasRef.current`

**`drills/[id]/page.tsx`**
- Replaces inline `DrillImage` + action bar buttons with `DrillPageClient`
- Passes `hasAnimation` prop (derived from `canvas_json`)
- Passes `drillId`, `drillTitle` props

---

## Data & Migrations

None required. Feature is entirely client-side with no new database tables, columns, or API routes.

---

## Out of Scope

- Sharing to specific internal users (separate DM share feature)
- Animated GIF export
- Configurable recording duration (fixed at 20s to match app maximum)
- Analytics/tracking of share events
