import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PITCH_OPTIONS, PitchGlyph, TOOL_META, TOOL_SHORTCUTS, ToolGlyph, toolForKey } from './tools'
import type { ToolType } from './types'

describe('tools (coverage)', () => {
  it('round-trips every shortcut through toolForKey, upper and lower case', () => {
    for (const [tool, key] of Object.entries(TOOL_SHORTCUTS) as [ToolType, string][]) {
      expect(toolForKey(key)).toBe(tool)
      expect(toolForKey(key.toUpperCase())).toBe(tool)
    }
  })

  it('ignores multi-character keys and whitespace', () => {
    expect(toolForKey('ab')).toBeNull()
    expect(toolForKey('Tab')).toBeNull()
    expect(toolForKey(' ')).toBeNull()
  })

  it('renders a glyph for every tool', () => {
    for (const tool of Object.keys(TOOL_META) as ToolType[]) {
      const { container, unmount } = render(<ToolGlyph tool={tool} />)
      expect(container.querySelector('svg'), tool).not.toBeNull()
      unmount()
    }
  })

  it('renders a glyph for every pitch option', () => {
    for (const { id } of PITCH_OPTIONS) {
      const { container, unmount } = render(<PitchGlyph pitch={id} />)
      expect(container.querySelector('svg'), id).not.toBeNull()
      unmount()
    }
  })
})
