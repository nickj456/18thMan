# Drill Designer Equipment Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five new equipment icons (Tackle Bag, Tackle Shield, Flag, Marker Disc, Agility Ladder) to the drill designer toolbar and canvas.

**Architecture:** Each new type is added to the `ToolType` union, gets a `makeElement` case in `DrillCanvas`, a toolbar button in `Toolbar`, and a Konva component in `CanvasElements`. Agility Ladder is resizable via corner handles (same pattern as Zone). All other new elements are fixed-size, click-to-place.

**Tech Stack:** React Konva (canvas rendering), lucide-react (toolbar icons), TypeScript

---

### Task 1: Add new ToolTypes to `types.ts`

**Files:**
- Modify: `web/src/components/designer/types.ts`

- [ ] **Step 1: Add the five new types to the ToolType union**

Open `web/src/components/designer/types.ts`. Replace the `ToolType` definition:

```ts
export type ToolType =
  | 'select'
  | 'attacker'
  | 'defender'
  | 'cone'
  | 'ball'
  | 'tackle-bag'
  | 'tackle-shield'
  | 'flag'
  | 'disc'
  | 'agility-ladder'
  | 'arrow'
  | 'line'
  | 'dotted'
  | 'kick'
  | 'zone'
  | 'text'
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors only about the new types not being handled yet in switch statements (that's fine — we'll fix those in later tasks). Zero errors is also fine if the compiler is lenient.

---

### Task 2: Add `makeElement` cases in `DrillCanvas.tsx`

**Files:**
- Modify: `web/src/components/designer/DrillCanvas.tsx`

- [ ] **Step 1: Add the five new cases to `makeElement`**

In `web/src/components/designer/DrillCanvas.tsx`, find the `makeElement` function and add cases after `case 'ball'`:

```ts
case 'tackle-bag':    return { ...base, color: '#ef4444' }
case 'tackle-shield': return { ...base, color: '#3b82f6' }
case 'flag':          return { ...base, color: '#22c55e' }
case 'disc':          return { ...base, color: '#f59e0b' }
case 'agility-ladder':
  return { ...base, color: '#6366f1', width: 40, height: 160 }
```

The full `makeElement` function should look like:

```ts
function makeElement(tool: ToolType, x: number, y: number, count: number, size: 'sm' | 'md' | 'lg' = 'md'): CanvasElement {
  const base = { id: nanoid(), type: tool, x, y }
  switch (tool) {
    case 'attacker':      return { ...base, color: '#ef4444', label: String(count), size }
    case 'defender':      return { ...base, color: '#3b82f6', label: String(count), size }
    case 'cone':          return { ...base, color: '#f59e0b' }
    case 'ball':          return { ...base, color: '#92400e' }
    case 'tackle-bag':    return { ...base, color: '#ef4444' }
    case 'tackle-shield': return { ...base, color: '#3b82f6' }
    case 'flag':          return { ...base, color: '#22c55e' }
    case 'disc':          return { ...base, color: '#f59e0b' }
    case 'agility-ladder':
      return { ...base, color: '#6366f1', width: 40, height: 160 }
    case 'zone':     return { ...base, x, y, color: 'rgba(239,68,68,0.15)', width: 120, height: 80 }
    case 'text':     return { ...base, label: 'Label', color: '#ffffff' }
    default:         return base
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | grep "DrillCanvas" | head -10
```

Expected: no errors from DrillCanvas.tsx.

---

### Task 3: Add toolbar buttons in `Toolbar.tsx`

**Files:**
- Modify: `web/src/components/designer/Toolbar.tsx`

- [ ] **Step 1: Add new lucide imports**

In `web/src/components/designer/Toolbar.tsx`, update the lucide-react import block to add the five new icons:

```ts
import {
  MousePointer2,
  Circle,
  Shield,
  Triangle,
  MoveRight,
  Minus,
  MoreHorizontal,
  Square,
  Type,
  Trash2,
  Undo2,
  Eraser,
  RotateCw,
  TrendingUp,
  RectangleVertical,
  RectangleHorizontal,
  Flag,
  Dot,
  AlignJustify,
} from 'lucide-react'
```

- [ ] **Step 2: Add five new entries to the TOOLS array**

In `Toolbar.tsx`, find the `TOOLS` array. Add the five new entries after `{ id: 'ball', ... }`:

```ts
const TOOLS: { id: ToolType; label: string; icon: React.ReactNode; color?: string }[] = [
  { id: 'select',        label: 'Select',  icon: <MousePointer2 size={15} /> },
  { id: 'attacker',      label: 'Attack',  icon: <Circle size={15} />,             color: 'text-red-400' },
  { id: 'defender',      label: 'Defend',  icon: <Shield size={15} />,             color: 'text-blue-400' },
  { id: 'cone',          label: 'Cone',    icon: <Triangle size={15} />,           color: 'text-amber-400' },
  { id: 'ball',          label: 'Ball',    icon: <Circle size={12} />,             color: 'text-orange-400' },
  { id: 'tackle-bag',    label: 'T.Bag',   icon: <RectangleVertical size={15} />,  color: 'text-red-300' },
  { id: 'tackle-shield', label: 'Shield',  icon: <RectangleHorizontal size={15} />,color: 'text-blue-300' },
  { id: 'flag',          label: 'Flag',    icon: <Flag size={15} />,               color: 'text-green-400' },
  { id: 'disc',          label: 'Disc',    icon: <Dot size={15} />,                color: 'text-amber-300' },
  { id: 'agility-ladder',label: 'Ladder',  icon: <AlignJustify size={15} />,       color: 'text-indigo-400' },
  { id: 'arrow',         label: 'Run',     icon: <MoveRight size={15} />,          color: 'text-green-400' },
  { id: 'line',          label: 'Pass',    icon: <Minus size={15} />,              color: 'text-zinc-300' },
  { id: 'dotted',        label: 'Dotted',  icon: <MoreHorizontal size={15} />,     color: 'text-zinc-400' },
  { id: 'kick',          label: 'Kick',    icon: <TrendingUp size={15} />,         color: 'text-amber-400' },
  { id: 'zone',          label: 'Zone',    icon: <Square size={15} />,             color: 'text-red-300' },
  { id: 'text',          label: 'Label',   icon: <Type size={15} /> },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | grep "Toolbar" | head -10
```

Expected: no errors.

---

### Task 4: Add fixed-size element components to `CanvasElements.tsx`

**Files:**
- Modify: `web/src/components/designer/CanvasElements.tsx`

- [ ] **Step 1: Add `Ellipse` to the react-konva import**

The new elements need `Ellipse` for rounded shapes. Update the import at the top of `web/src/components/designer/CanvasElements.tsx`:

```ts
import { Circle, Ellipse, Rect, Arrow, Line, Text, Group, Shape } from 'react-konva'
```

- [ ] **Step 2: Add `TackleBagEl` after the `ConeEl` function**

Add this component after the closing `}` of `ConeEl`:

```tsx
// ── Tackle bag ────────────────────────────────────────────────────────────────
function TackleBagEl({ el, selected, onSelect, onChange }: ElementProps) {
  const w = 18, h = 36
  return (
    <Group x={el.x} y={el.y} draggable onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} cornerRadius={5}
        fill={el.color ?? '#ef4444'}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={selected ? 2 : 1} />
      <Rect x={-w / 2} y={-5} width={w} height={4} cornerRadius={1}
        fill="rgba(0,0,0,0.3)" listening={false} />
      <Rect x={-w / 2} y={2} width={w} height={4} cornerRadius={1}
        fill="rgba(0,0,0,0.3)" listening={false} />
      <Ellipse x={0} y={h / 2 + 3} radiusX={w / 2} radiusY={3}
        fill="rgba(0,0,0,0.3)" listening={false} />
    </Group>
  )
}
```

- [ ] **Step 3: Add `TackleShieldEl` after `TackleBagEl`**

```tsx
// ── Tackle shield ─────────────────────────────────────────────────────────────
function TackleShieldEl({ el, selected, onSelect, onChange }: ElementProps) {
  const w = 36, h = 22
  return (
    <Group x={el.x} y={el.y} draggable onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      <Rect x={-w / 2} y={-h / 2} width={w} height={h} cornerRadius={8}
        fill={el.color ?? '#3b82f6'}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={selected ? 2 : 1} />
      <Rect x={-5} y={-5} width={10} height={10} cornerRadius={3}
        fill="rgba(0,0,0,0.35)" listening={false} />
      <Line points={[-w / 2 + 4, 0, w / 2 - 4, 0]}
        stroke="rgba(255,255,255,0.2)" strokeWidth={1} listening={false} />
    </Group>
  )
}
```

- [ ] **Step 4: Add `FlagEl` after `TackleShieldEl`**

```tsx
// ── Flag / pole ───────────────────────────────────────────────────────────────
function FlagEl({ el, selected, onSelect, onChange }: ElementProps) {
  return (
    <Group x={el.x} y={el.y} draggable onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      <Line points={[0, -20, 0, 18]}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.7)'}
        strokeWidth={selected ? 2.5 : 2} strokeLinecap="round" />
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          ctx.moveTo(0, -20)
          ctx.lineTo(18, -13)
          ctx.lineTo(0, -6)
          ctx.closePath()
          ctx.fillStrokeShape(shape)
        }}
        fill={el.color ?? '#22c55e'}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={1}
        listening={false}
      />
      <Ellipse x={0} y={20} radiusX={5} radiusY={2.5}
        fill="rgba(255,255,255,0.25)" listening={false} />
    </Group>
  )
}
```

- [ ] **Step 5: Add `DiscEl` after `FlagEl`**

```tsx
// ── Marker disc ───────────────────────────────────────────────────────────────
function DiscEl({ el, selected, onSelect, onChange }: ElementProps) {
  return (
    <Group x={el.x} y={el.y} draggable onClick={onSelect} onTap={onSelect}
      onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}>
      <Ellipse radiusX={18} radiusY={7}
        fill={el.color ?? '#f59e0b'}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={selected ? 2 : 1} />
      <Ellipse radiusX={10} radiusY={3.5}
        fill="rgba(255,255,255,0.18)" listening={false} />
    </Group>
  )
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | grep "CanvasElements" | head -10
```

Expected: no errors from CanvasElements.tsx yet (the switch statement is not yet updated).

---

### Task 5: Add resizable `AgilityLadderEl` to `CanvasElements.tsx`

**Files:**
- Modify: `web/src/components/designer/CanvasElements.tsx`

- [ ] **Step 1: Add `AgilityLadderEl` after `DiscEl`**

```tsx
// ── Agility ladder (resizable) ────────────────────────────────────────────────
function AgilityLadderEl({ el, selected, onSelect, onChange }: ElementProps) {
  const x = el.x
  const y = el.y
  const w = el.width ?? 40
  const h = el.height ?? 160
  const rungCount = Math.max(3, Math.floor(h / 24))
  const rungs = Array.from({ length: rungCount }, (_, i) => {
    const spacing = h / (rungCount + 1)
    return y + spacing * (i + 1)
  })

  function resizeCorner(cornerX: number, cornerY: number, corner: 'nw' | 'ne' | 'sw' | 'se') {
    const origRight = x + w
    const origBottom = y + h
    switch (corner) {
      case 'nw': return onChange({ ...el, x: cornerX, y: cornerY, width: Math.max(20, origRight - cornerX), height: Math.max(60, origBottom - cornerY) })
      case 'ne': return onChange({ ...el, y: cornerY, width: Math.max(20, cornerX - x), height: Math.max(60, origBottom - cornerY) })
      case 'sw': return onChange({ ...el, x: cornerX, width: Math.max(20, origRight - cornerX), height: Math.max(60, cornerY - y) })
      case 'se': return onChange({ ...el, width: Math.max(20, cornerX - x), height: Math.max(60, cornerY - y) })
    }
  }

  return (
    <Group onClick={onSelect} onTap={onSelect}>
      {/* Rails */}
      <Line points={[x, y, x, y + h]}
        stroke="rgba(255,255,255,0.6)" strokeWidth={selected ? 3 : 2} hitStrokeWidth={12} />
      <Line points={[x + w, y, x + w, y + h]}
        stroke="rgba(255,255,255,0.6)" strokeWidth={selected ? 3 : 2} hitStrokeWidth={12} />
      {/* Rungs */}
      {rungs.map((ry, i) => (
        <Line key={i} points={[x, ry, x + w, ry]}
          stroke={el.color ?? '#6366f1'} strokeWidth={2} listening={false} />
      ))}
      {/* Transparent draggable hit area */}
      <Rect
        x={x} y={y} width={w} height={h}
        fill="transparent"
        stroke={selected ? 'rgba(255,255,255,0.15)' : 'transparent'}
        strokeWidth={1}
        dash={selected ? [4, 4] : undefined}
        draggable
        onDragEnd={(e) => onChange({ ...el, x: e.target.x(), y: e.target.y() })}
      />
      {/* Corner resize handles */}
      {selected && (
        <>
          {([
            { cx: x,     cy: y,     corner: 'nw' as const },
            { cx: x + w, cy: y,     corner: 'ne' as const },
            { cx: x,     cy: y + h, corner: 'sw' as const },
            { cx: x + w, cy: y + h, corner: 'se' as const },
          ] as const).map(({ cx, cy, corner }) => (
            <Circle
              key={corner}
              x={cx} y={cy}
              radius={HANDLE_RADIUS}
              fill={HANDLE_FILL}
              stroke={HANDLE_STROKE}
              strokeWidth={HANDLE_STROKE_WIDTH}
              draggable
              onDragMove={(e: Konva.KonvaEventObject<DragEvent>) =>
                resizeCorner(e.target.x(), e.target.y(), corner)}
            />
          ))}
        </>
      )}
    </Group>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web && npx tsc --noEmit 2>&1 | grep "CanvasElements" | head -10
```

Expected: no errors from CanvasElements.tsx yet.

---

### Task 6: Wire up new elements in the `CanvasElements` orchestrator and commit

**Files:**
- Modify: `web/src/components/designer/CanvasElements.tsx`

- [ ] **Step 1: Add new cases to the switch statement in `CanvasElements`**

Find the `CanvasElements` export function and its switch statement. Add the five new cases:

```tsx
export function CanvasElements({ elements, selectedId, editingTextId: _editingTextId, onSelect, onChange, onEditText }: CanvasElementsProps) {
  return (
    <>
      {elements.map((el) => {
        const props: ElementProps = {
          el,
          selected: el.id === selectedId,
          onSelect: () => onSelect(el.id),
          onChange,
          onDblClick: (el.type === 'text' || el.type === 'attacker' || el.type === 'defender')
            ? () => onEditText(el.id)
            : undefined,
        }
        switch (el.type) {
          case 'attacker':       return <AttackerEl key={el.id} {...props} />
          case 'defender':       return <DefenderEl key={el.id} {...props} />
          case 'cone':           return <ConeEl key={el.id} {...props} />
          case 'ball':           return <RugbyBall key={el.id} {...props} />
          case 'tackle-bag':     return <TackleBagEl key={el.id} {...props} />
          case 'tackle-shield':  return <TackleShieldEl key={el.id} {...props} />
          case 'flag':           return <FlagEl key={el.id} {...props} />
          case 'disc':           return <DiscEl key={el.id} {...props} />
          case 'agility-ladder': return <AgilityLadderEl key={el.id} {...props} />
          case 'arrow':          return <ArrowEl key={el.id} {...props} />
          case 'line':           return <LineEl key={el.id} {...props} />
          case 'dotted':         return <LineEl key={el.id} {...props} />
          case 'kick':           return <KickEl key={el.id} {...props} />
          case 'zone':           return <ZoneEl key={el.id} {...props} />
          case 'text':           return <TextEl key={el.id} {...props} />
          default:               return null
        }
      })}
    </>
  )
}
```

- [ ] **Step 2: Full TypeScript check**

```bash
cd web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Run the dev server and manually verify**

```bash
cd web && npm run dev
```

Open the drill designer in the browser. Verify:
- Five new tool buttons appear in the toolbar (T.Bag, Shield, Flag, Disc, Ladder)
- Clicking each places the icon on the canvas at the cursor
- Tackle Bag: tall red rounded rect with grip bands
- Tackle Shield: wide blue rounded rect with handle
- Flag: white pole with green pennant
- Disc: flat amber ellipse
- Agility Ladder: white rails + indigo rungs
- Agility Ladder: when selected, shows 4 corner handles — drag them to resize
- Agility Ladder: rungs recount as you resize (fewer when short, more when tall)
- All new elements: can be dragged to reposition
- All new elements: animate correctly in timeline (x/y moves; ladder width/height also interpolates)

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/nickj/18th Man"
git add web/src/components/designer/types.ts \
        web/src/components/designer/DrillCanvas.tsx \
        web/src/components/designer/Toolbar.tsx \
        web/src/components/designer/CanvasElements.tsx
git commit -m "feat: add tackle bag, shield, flag, disc, and agility ladder to drill designer"
```

---

## Self-Review Notes

- All 5 types covered: tackle-bag ✓, tackle-shield ✓, flag ✓, disc ✓, agility-ladder ✓
- Agility ladder resize: follows ZoneEl pattern exactly, min w=20 min h=60 ✓
- Rungs computed dynamically from height ✓
- `Ellipse` re-added to CanvasElements import (needed by TackleBagEl, FlagEl, DiscEl) ✓
- `makeElement` cases produce correct defaults (width/height for ladder) ✓
- Switch statement in CanvasElements orchestrator covers all new types ✓
- No animation changes needed — existing numKeys list in DrillDesigner already includes `width` and `height` for keyframe interpolation ✓
