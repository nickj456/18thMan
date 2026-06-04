# Drill Designer — New Equipment Icons

**Date:** 2026-06-04
**Status:** Approved

## Overview

Add five new rugby-specific equipment icons to the drill designer toolbar: Tackle Bag, Tackle Shield, Flag/Pole, Marker Disc, and Agility Ladder. The Agility Ladder is resizable; the rest are fixed-size click-to-place elements.

## New Tool Types

Add to `ToolType` union in `types.ts`:

```
'tackle-bag' | 'tackle-shield' | 'flag' | 'disc' | 'agility-ladder'
```

## Toolbar Changes (`Toolbar.tsx`)

Add five entries to the `TOOLS` array, inserted after `ball`:

| id | Label | Icon | Color |
|----|-------|------|-------|
| `tackle-bag` | T.Bag | `RectangleVertical` | `text-red-400` |
| `tackle-shield` | Shield | `Shield` (existing) — but recoloured | `text-blue-300` |
| `flag` | Flag | `Flag` | `text-green-400` |
| `disc` | Disc | `Disc` or `Circle` (small flat) | `text-amber-300` |
| `agility-ladder` | Ladder | `LayoutGrid` or custom | `text-indigo-400` |

Use lucide-react icons. Pick the closest available icon for the toolbar button — the actual on-canvas rendering is the Konva element, not the icon.

## Canvas Elements (`CanvasElements.tsx`)

### TackleBagEl
- Tall rounded rectangle (18px wide × 36px tall) centred on click point
- Default color `#ef4444` (red)
- Grip bands: two horizontal dark rectangles across the middle third
- Base shadow: small ellipse below
- Fixed size — drag to reposition only

### TackleShieldEl
- Wide rounded rectangle (36px wide × 24px tall) centred on click point
- Default color `#3b82f6` (blue)
- Central handle: small rounded rect in the middle
- Horizontal centre line (stitching)
- Fixed size — drag to reposition only

### FlagEl
- Vertical pole (2px line, 40px tall)
- Pennant triangle at the top (right-pointing)
- Small ellipse base at the bottom
- Default color `#22c55e` (green) for the pennant
- Fixed size — drag to reposition only

### DiscEl
- Flat ellipse (top-down view): 20px × 8px
- Default color `#f59e0b` (amber)
- Inner highlight ellipse for depth
- Fixed size — drag to reposition only

### AgilityLadderEl
- Two vertical rails + N rungs (calculated from height)
- Default placement: 40px wide × 160px tall, centred on click point (x, y = top-left corner)
- `width` and `height` stored on the CanvasElement (same fields used by ZoneEl)
- Rungs: spaced evenly, count = `Math.max(3, Math.floor(height / 24))` — always at least 3
- Rail color: `rgba(255,255,255,0.6)`, rung color: `#6366f1` (indigo)
- Default color stored but not currently used for rendering (reserved for future colour picker)
- **Resizable**: when selected, shows 4 corner drag handles (same logic as ZoneEl)
  - `nw` corner adjusts x, y, width, height
  - `ne` corner adjusts y, width, height
  - `sw` corner adjusts x, width, height
  - `se` corner adjusts width, height
  - Min size: 20px × 60px
- Draggable as a unit via the rails (hitStrokeWidth padding)

## DrillCanvas Changes (`DrillCanvas.tsx`)

Add cases to `makeElement`:

```ts
case 'tackle-bag':    return { ...base, color: '#ef4444' }
case 'tackle-shield': return { ...base, color: '#3b82f6' }
case 'flag':          return { ...base, color: '#22c55e' }
case 'disc':          return { ...base, color: '#f59e0b' }
case 'agility-ladder':
  return { ...base, color: '#6366f1', width: 40, height: 160 }
```

For the agility ladder, x/y in `makeElement` is the click point — use it as the top-left of the ladder rect (consistent with ZoneEl behaviour, where x/y is top-left).

## Data Model

No changes to `CanvasElement` interface — `width` and `height` fields are already defined (used by zones). No migration needed since these are purely additive new tool types.

## Scope Boundaries

- No colour picker for new icons in this iteration (same as existing cones/balls — colour is fixed per type)
- No animation keyframe support beyond what already exists (x/y interpolation works automatically; width/height interpolation also works since it's in the numKeys list in DrillDesigner)
- No resize handles on tackle bag, shield, flag, or disc
