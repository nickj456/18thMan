import { describe, it, expect } from 'vitest'
import { PITCH_OPTIONS, TOOL_COLORS, TOOL_GROUPS, TOOL_META, TOOL_SHORTCUTS, toolForKey } from './tools'
import type { PitchBackground, ToolType } from './types'

// Mirrors the ToolType union. If a tool is added to types.ts without updating
// this list, the exhaustive TOOL_META record fails to typecheck first anyway.
const ALL_TOOLS: ToolType[] = [
  'select', 'attacker', 'defender', 'cone', 'ball', 'tackle-bag', 'tackle-shield',
  'flag', 'disc', 'agility-ladder', 'arrow', 'line', 'dotted', 'kick', 'zone', 'text',
]
const ALL_PITCHES: PitchBackground[] = ['full', 'half', 'blank', 'ingoal']

describe('tool palette data', () => {
  it('gives every tool a label and a description', () => {
    for (const tool of ALL_TOOLS) {
      expect(TOOL_META[tool].label.length, tool).toBeGreaterThan(0)
      expect(TOOL_META[tool].description.length, tool).toBeGreaterThan(0)
    }
  })

  it('places every tool except select in exactly one group', () => {
    const seen = new Map<ToolType, number>()
    for (const group of TOOL_GROUPS) {
      for (const tool of group.tools) seen.set(tool, (seen.get(tool) ?? 0) + 1)
    }
    expect(seen.has('select')).toBe(false)
    for (const tool of ALL_TOOLS.filter(t => t !== 'select')) {
      expect(seen.get(tool), `${tool} should be in exactly one group`).toBe(1)
    }
  })

  it('uses unique single-character lowercase shortcuts', () => {
    const keys = Object.values(TOOL_SHORTCUTS)
    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) {
      expect(key).toMatch(/^[a-z]$/)
    }
  })

  it('colours every piece that is drawn on the canvas (select and text are neutral)', () => {
    const coloured = Object.keys(TOOL_COLORS) as ToolType[]
    for (const tool of ALL_TOOLS.filter(t => t !== 'select' && t !== 'text')) {
      expect(coloured, tool).toContain(tool)
      expect(TOOL_COLORS[tool as keyof typeof TOOL_COLORS]).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })

  it('offers every pitch background exactly once', () => {
    expect(PITCH_OPTIONS.map(o => o.id).sort()).toEqual([...ALL_PITCHES].sort())
  })
})

describe('toolForKey', () => {
  it('maps a shortcut letter to its tool regardless of case', () => {
    expect(toolForKey('v')).toBe('select')
    expect(toolForKey('a')).toBe('attacker')
    expect(toolForKey('A')).toBe('attacker')
    expect(toolForKey('r')).toBe('arrow')
    expect(toolForKey('t')).toBe('text')
  })

  it('returns null for letters without a shortcut and for named keys', () => {
    expect(toolForKey('q')).toBeNull()
    expect(toolForKey('1')).toBeNull()
    expect(toolForKey('Escape')).toBeNull()
    expect(toolForKey('Delete')).toBeNull()
    expect(toolForKey('')).toBeNull()
  })
})
