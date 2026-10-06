import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Toolbar } from './Toolbar'

function setup(overrides: Partial<React.ComponentProps<typeof Toolbar>> = {}) {
  const props: React.ComponentProps<typeof Toolbar> = {
    activeTool: 'select',
    onToolChange: vi.fn(),
    background: 'full',
    onBackgroundChange: vi.fn(),
    pitchFlipped: false,
    onFlipPitch: vi.fn(),
    playerSize: 'md',
    onPlayerSizeChange: vi.fn(),
    hasSelection: false,
    onDelete: vi.fn(),
    onUndo: vi.fn(),
    onClear: vi.fn(),
    canUndo: false,
    hasElements: false,
    ...overrides,
  }
  render(<Toolbar {...props} />)
  return props
}

describe('Toolbar (coverage)', () => {
  it('offers to rotate to vertical when the pitch is horizontal', () => {
    setup({ pitchFlipped: false })
    expect(screen.getByRole('button', { name: 'Rotate pitch to vertical' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('groups tools into labelled sections', () => {
    setup()
    for (const name of ['Players', 'Equipment', 'Movement', 'Mark-up', 'Pitch']) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument()
    }
  })

  it('shows the uppercased shortcut in the tool tooltip', async () => {
    setup()
    await userEvent.hover(screen.getByRole('button', { name: 'Attacker' }))
    expect(await screen.findByText('A', { selector: 'kbd' })).toBeInTheDocument()
  })

  it('shows a multi-key shortcut verbatim', async () => {
    setup({ canUndo: true })
    await userEvent.hover(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByText('Ctrl+Z', { selector: 'kbd' })).toBeInTheDocument()
  })
})
