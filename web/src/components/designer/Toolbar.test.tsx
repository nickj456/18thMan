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

describe('Toolbar', () => {
  it('marks only the active tool as pressed', () => {
    setup({ activeTool: 'attacker' })
    expect(screen.getByRole('button', { name: 'Attacker' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Run' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a tool on click', async () => {
    const props = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Kick' }))
    expect(props.onToolChange).toHaveBeenCalledWith('kick')
  })

  it('disables undo, delete and clear until there is history, a selection, or elements', () => {
    setup({ canUndo: false, hasSelection: false, hasElements: false })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear canvas' })).toBeDisabled()
  })

  it('fires undo, delete and clear once enabled', async () => {
    const props = setup({ canUndo: true, hasSelection: true, hasElements: true })
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear canvas' }))
    expect(props.onUndo).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
    expect(props.onClear).toHaveBeenCalledTimes(1)
  })

  it('reflects the current player size and changes it', async () => {
    const props = setup({ playerSize: 'lg' })
    expect(screen.getByRole('radio', { name: 'Large players' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Medium players' })).toHaveAttribute('aria-checked', 'false')
    await userEvent.click(screen.getByRole('radio', { name: 'Small players' }))
    expect(props.onPlayerSizeChange).toHaveBeenCalledWith('sm')
  })

  it('marks the current pitch and switches it', async () => {
    const props = setup({ background: 'half' })
    expect(screen.getByRole('button', { name: 'Half pitch' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Full pitch' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Grid' }))
    expect(props.onBackgroundChange).toHaveBeenCalledWith('blank')
  })

  it('renders a short touch label under every tile (CSS shows it on coarse pointers only)', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Tackle bag' })).toHaveTextContent('Bag')
    expect(screen.getByRole('button', { name: 'Marker disc' })).toHaveTextContent('Disc')
    expect(screen.getByRole('button', { name: 'In-goal area' })).toHaveTextContent('In-goal')
  })

  it('toggles pitch orientation', async () => {
    const props = setup({ pitchFlipped: true })
    const rotate = screen.getByRole('button', { name: /vertical/i })
    expect(rotate).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(rotate)
    expect(props.onFlipPitch).toHaveBeenCalledTimes(1)
  })
})
