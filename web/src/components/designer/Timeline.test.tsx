import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Timeline } from './Timeline'
import type { CanvasState } from './types'

const twoKeyframes: CanvasState = {
  background: 'full',
  duration: 90,
  elements: [
    { id: 'a1', type: 'attacker', x: 10, y: 10, label: '1' },
    { id: 'c1', type: 'cone', x: 50, y: 50 },
  ],
  keyframes: [
    { time: 0,  elementStates: { a1: { x: 10, y: 10 }, c1: { x: 50, y: 50 } } },
    { time: 60, elementStates: { a1: { x: 100, y: 10 } } },
  ],
}

function setup(overrides: Partial<React.ComponentProps<typeof Timeline>> = {}) {
  const props: React.ComponentProps<typeof Timeline> = {
    state: twoKeyframes,
    currentFrame: 0,
    isPlaying: false,
    onFrameChange: vi.fn(),
    onAddKeyframe: vi.fn(),
    onDeleteKeyframe: vi.fn(),
    onTogglePlay: vi.fn(),
    onDurationChange: vi.fn(),
    ...overrides,
  }
  render(<Timeline {...props} />)
  return props
}

describe('Timeline', () => {
  it('offers Update and Delete while the playhead sits on a keyframe', async () => {
    const props = setup({ currentFrame: 0 })
    expect(screen.getByRole('button', { name: 'Update keyframe' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete keyframe' }))
    expect(props.onDeleteKeyframe).toHaveBeenCalledWith(0)
  })

  it('offers Add (and no Delete) between keyframes', async () => {
    const props = setup({ currentFrame: 30 })
    expect(screen.queryByRole('button', { name: 'Delete keyframe' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add keyframe' }))
    expect(props.onAddKeyframe).toHaveBeenCalledTimes(1)
  })

  it('labels the transport button from the playing state', async () => {
    const paused = setup({ isPlaying: false })
    await userEvent.click(screen.getByRole('button', { name: 'Play' }))
    expect(paused.onTogglePlay).toHaveBeenCalledTimes(1)
  })

  it('shows Pause while playing', () => {
    setup({ isPlaying: true })
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument()
  })

  it('jumps the playhead to a keyframe when its marker is activated', async () => {
    const props = setup({ currentFrame: 0 })
    await userEvent.click(screen.getByRole('button', { name: 'Keyframe at 2.00s' }))
    expect(props.onFrameChange).toHaveBeenCalledWith(60)
  })

  it('changes the animation duration', async () => {
    const props = setup()
    await userEvent.selectOptions(screen.getByLabelText('Animation duration'), '150')
    expect(props.onDurationChange).toHaveBeenCalledWith(150)
  })

  it('names rows after the pieces on the canvas', () => {
    setup()
    expect(screen.getByText('Att 1')).toBeInTheDocument()
    expect(screen.getByText('Cone')).toBeInTheDocument()
  })

  it('explains what to do when the canvas is empty', () => {
    setup({ state: { background: 'full', elements: [] } })
    expect(screen.getByText('Add elements to the canvas to animate them')).toBeInTheDocument()
  })
})
