'use client'

import { MousePointer2, Type } from 'lucide-react'
import type { PitchBackground, ToolType } from './types'

/**
 * Tool palette data for the drill designer rail.
 *
 * Everything the Toolbar renders comes from here so the palette can be tested
 * without a canvas: labels, grouping, keyboard shortcuts and the glyphs. Glyph
 * colours mirror the defaults in DrillCanvas.makeElement / CanvasElements so a
 * tile looks like the piece it drops on the pitch.
 */

export const TOOL_COLORS = {
  attacker: '#ef4444',
  defender: '#3b82f6',
  cone: '#f59e0b',
  ball: '#f5f5f0',
  'tackle-bag': '#ef4444',
  'tackle-shield': '#3b82f6',
  flag: '#22c55e',
  disc: '#f59e0b',
  'agility-ladder': '#6366f1',
  arrow: '#22c55e',
  line: '#a3a3a3',
  dotted: '#a3a3a3',
  kick: '#fbbf24',
  zone: '#ef4444',
} as const satisfies Partial<Record<ToolType, string>>

export interface ToolMeta {
  label: string
  /** Shown under the tile on touch devices (no hover, so no tooltip). Six characters or fewer. */
  short: string
  /** Tooltip body: what clicking or dragging on the canvas does. */
  description: string
}

export const TOOL_META: Record<ToolType, ToolMeta> = {
  select:           { label: 'Select', short: 'Select',        description: 'Select and move pieces' },
  attacker:         { label: 'Attacker', short: 'Attack',      description: 'Click the pitch to place an attacking player' },
  defender:         { label: 'Defender', short: 'Defend',      description: 'Click the pitch to place a defending player' },
  cone:             { label: 'Cone', short: 'Cone',          description: 'Click the pitch to place a cone' },
  ball:             { label: 'Ball', short: 'Ball',          description: 'Click the pitch to place the ball' },
  'tackle-bag':     { label: 'Tackle bag', short: 'Bag',    description: 'Click the pitch to place a tackle bag' },
  'tackle-shield':  { label: 'Tackle shield', short: 'Shield', description: 'Click the pitch to place a tackle shield' },
  flag:             { label: 'Flag', short: 'Flag',          description: 'Click the pitch to place a flag or pole' },
  disc:             { label: 'Marker disc', short: 'Disc',   description: 'Click the pitch to place a flat marker' },
  'agility-ladder': { label: 'Agility ladder', short: 'Ladder', description: 'Click the pitch to place a resizable ladder' },
  arrow:            { label: 'Run', short: 'Run',           description: 'Drag to draw a running line' },
  line:             { label: 'Pass', short: 'Pass',          description: 'Drag to draw a pass' },
  dotted:           { label: 'Dotted line', short: 'Dotted',   description: 'Drag to draw a dotted line' },
  kick:             { label: 'Kick', short: 'Kick',          description: 'Drag to draw a kick arc' },
  zone:             { label: 'Zone', short: 'Zone',          description: 'Click the pitch to mark out an area' },
  text:             { label: 'Label', short: 'Label',         description: 'Click the pitch to add a text label' },
}

export interface ToolGroup {
  id: 'players' | 'equipment' | 'movement' | 'markup'
  label: string
  tools: ToolType[]
}

/** `select` is deliberately not in a group: it sits alone at the top of the rail. */
export const TOOL_GROUPS: ToolGroup[] = [
  { id: 'players',   label: 'Players',   tools: ['attacker', 'defender'] },
  { id: 'equipment', label: 'Equipment', tools: ['cone', 'ball', 'tackle-bag', 'tackle-shield', 'flag', 'disc', 'agility-ladder'] },
  { id: 'movement',  label: 'Movement',  tools: ['arrow', 'line', 'dotted', 'kick'] },
  { id: 'markup',    label: 'Mark-up',   tools: ['zone', 'text'] },
]

/** Single-key shortcuts (no modifier). Lowercase so they can be matched against `KeyboardEvent.key`. */
export const TOOL_SHORTCUTS: Partial<Record<ToolType, string>> = {
  select: 'v',
  attacker: 'a',
  defender: 'd',
  cone: 'c',
  ball: 'b',
  flag: 'f',
  arrow: 'r',
  line: 'p',
  kick: 'k',
  zone: 'z',
  text: 't',
}

/** Resolve a `KeyboardEvent.key` to the tool it selects, or null when it isn't a tool shortcut. */
export function toolForKey(key: string): ToolType | null {
  if (key.length !== 1) return null
  const k = key.toLowerCase()
  for (const tool of Object.keys(TOOL_SHORTCUTS) as ToolType[]) {
    if (TOOL_SHORTCUTS[tool] === k) return tool
  }
  return null
}

export const PITCH_OPTIONS: { id: PitchBackground; label: string; short: string }[] = [
  { id: 'full',   label: 'Full pitch',   short: 'Full' },
  { id: 'half',   label: 'Half pitch',   short: 'Half' },
  { id: 'blank',  label: 'Grid',         short: 'Grid' },
  { id: 'ingoal', label: 'In-goal area', short: 'In-goal' },
]

// ── Glyphs ────────────────────────────────────────────────────────────────────
// 24×24 viewBox. Neutral strokes use currentColor so they follow the theme; the
// piece colours are the real canvas colours.

const GLYPH_SIZE = 20
const WHITE_40 = 'rgba(255,255,255,0.4)'

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width={GLYPH_SIZE}
      height={GLYPH_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  )
}

function PlayerGlyph({ color, letter }: { color: string; letter: string }) {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" fill={color} stroke={WHITE_40} strokeWidth="1.5" />
      <text x="12" y="15.6" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff" style={{ fontFamily: 'inherit' }}>
        {letter}
      </text>
    </Svg>
  )
}

export function ToolGlyph({ tool }: { tool: ToolType }) {
  switch (tool) {
    case 'select':
      return <MousePointer2 size={18} aria-hidden />
    case 'text':
      return <Type size={18} aria-hidden />
    case 'attacker':
      return <PlayerGlyph color={TOOL_COLORS.attacker} letter="A" />
    case 'defender':
      return <PlayerGlyph color={TOOL_COLORS.defender} letter="D" />
    case 'cone':
      return (
        <Svg>
          <path d="M12 3.5 L20 20.5 H4 Z" fill={TOOL_COLORS.cone} stroke={WHITE_40} strokeWidth="1" strokeLinejoin="round" />
        </Svg>
      )
    case 'ball':
      return (
        <Svg>
          <path d="M2.5 12 C 6.5 5, 17.5 5, 21.5 12 C 17.5 19, 6.5 19, 2.5 12 Z" fill={TOOL_COLORS.ball} stroke="#1a1a1a" strokeWidth="1.2" />
          <path d="M4 12 Q 12 9.6 20 12 M4 12 Q 12 14.4 20 12" stroke="#374151" strokeWidth="0.8" />
          <path d="M9 10.6v2.8 M11 10.3v3.4 M13 10.3v3.4 M15 10.6v2.8" stroke="#374151" strokeWidth="0.8" strokeLinecap="round" />
        </Svg>
      )
    case 'tackle-bag':
      return (
        <Svg>
          <rect x="8" y="3" width="8" height="18" rx="2.5" fill={TOOL_COLORS['tackle-bag']} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <rect x="8" y="9.5" width="8" height="2" fill="rgba(0,0,0,0.35)" />
          <rect x="8" y="13" width="8" height="2" fill="rgba(0,0,0,0.35)" />
        </Svg>
      )
    case 'tackle-shield':
      return (
        <Svg>
          <rect x="3" y="7" width="18" height="10" rx="3.5" fill={TOOL_COLORS['tackle-shield']} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" fill="rgba(0,0,0,0.35)" />
        </Svg>
      )
    case 'flag':
      return (
        <Svg>
          <path d="M7 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M7.8 4 L18.5 8.2 L7.8 12.4 Z" fill={TOOL_COLORS.flag} />
          <ellipse cx="7" cy="21" rx="3.2" ry="1.2" fill="currentColor" opacity="0.35" />
        </Svg>
      )
    case 'disc':
      return (
        <Svg>
          <ellipse cx="12" cy="13" rx="10" ry="4" fill={TOOL_COLORS.disc} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <ellipse cx="12" cy="13" rx="5.5" ry="1.8" fill="rgba(255,255,255,0.25)" />
        </Svg>
      )
    case 'agility-ladder':
      return (
        <Svg>
          <path d="M8 3v18 M16 3v18" stroke="currentColor" strokeWidth="1.6" opacity="0.7" strokeLinecap="round" />
          <path d="M8 7.5h8 M8 12h8 M8 16.5h8" stroke={TOOL_COLORS['agility-ladder']} strokeWidth="1.8" strokeLinecap="round" />
        </Svg>
      )
    case 'arrow':
      return (
        <Svg>
          <path d="M4.5 19.5 L15.5 8.5" stroke={TOOL_COLORS.arrow} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M19.5 4.5 L12.3 6.4 L17.6 11.7 Z" fill={TOOL_COLORS.arrow} />
        </Svg>
      )
    case 'line':
      return (
        <Svg>
          <path d="M4 18 L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </Svg>
      )
    case 'dotted':
      return (
        <Svg>
          <path d="M4 18 L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="2.4 3.4" />
        </Svg>
      )
    case 'kick':
      return (
        <Svg>
          <path d="M3 19 Q 11 -2 20.5 12.5" stroke={TOOL_COLORS.kick} strokeWidth="1.9" strokeLinecap="round" strokeDasharray="3.6 2.4" />
          <path d="M21.6 15.2 L17.3 13.8 L20.1 10.5 Z" fill={TOOL_COLORS.kick} />
          <ellipse cx="11.2" cy="7.4" rx="3.2" ry="1.9" fill="#f5f5f0" stroke={TOOL_COLORS.kick} strokeWidth="0.8" />
        </Svg>
      )
    case 'zone':
      return (
        <Svg>
          <rect x="3.5" y="5" width="17" height="14" rx="1" fill="rgba(239,68,68,0.18)" stroke={TOOL_COLORS.zone} strokeWidth="1.5" strokeDasharray="4 2.5" />
        </Svg>
      )
  }
}

export function PitchGlyph({ pitch }: { pitch: PitchBackground }) {
  const frame = <rect x="2.5" y="6" width="19" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
  switch (pitch) {
    case 'full':
      return (
        <Svg>
          {frame}
          <path d="M12 6v12 M6 6v12 M18 6v12" stroke="currentColor" strokeWidth="1.2" />
        </Svg>
      )
    case 'half':
      return (
        <Svg>
          {frame}
          <path d="M7 6v12" stroke="currentColor" strokeWidth="1.2" />
          <path d="M15 6v12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 1.6" />
        </Svg>
      )
    case 'blank':
      return (
        <Svg>
          {frame}
          <path d="M8.8 6v12 M15.2 6v12 M2.5 12h19" stroke="currentColor" strokeWidth="1" strokeDasharray="1.4 1.6" opacity="0.7" />
        </Svg>
      )
    case 'ingoal':
      return (
        <Svg>
          {frame}
          <rect x="2.5" y="6" width="5.5" height="12" fill="currentColor" opacity="0.22" />
          <path d="M8 6v12" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5.2 9.5v5 M8.6 9.5v5 M5.2 12h3.4" stroke="#f59e0b" strokeWidth="1.3" strokeLinecap="round" />
        </Svg>
      )
  }
}
