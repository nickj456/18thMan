import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import type { CanvasState } from './types'

// Remotion's Player needs a real browser; stub it so the dialog chrome can be tested.
vi.mock('@remotion/player', () => ({
  Player: (props: { durationInFrames: number }) => (
    <div data-testid="remotion-player" data-duration={props.durationInFrames} />
  ),
}))
vi.mock('./DrillAnimationComp', () => ({
  DrillAnimationComp: () => null,
  COMP_WIDTH: 1280,
  COMP_HEIGHT: 720,
}))

import { AnimationPreview } from './AnimationPreview'

const kf = (time: number) => ({ time, elementStates: {} })

describe('AnimationPreview', () => {
  it('titles the dialog with the drill name and summarises keyframes and length', () => {
    const state: CanvasState = { background: 'full', elements: [], duration: 150, keyframes: [kf(0), kf(60), kf(120)] }
    render(<AnimationPreview canvasJson={state} drillTitle="Wrap play" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Wrap play')).toBeInTheDocument()
    expect(screen.getByText(/3 keyframes · 5\.0s · 30fps/)).toBeInTheDocument()
    expect(screen.getByTestId('remotion-player')).toHaveAttribute('data-duration', '150')
  })

  it('falls back to a generic title, the 3s default and a singular keyframe', () => {
    const state: CanvasState = { background: 'full', elements: [], keyframes: [kf(0)] }
    render(<AnimationPreview canvasJson={state} onClose={vi.fn()} />)
    expect(screen.getByText('Drill animation')).toBeInTheDocument()
    expect(screen.getByText(/^1 keyframe · 3\.0s/)).toBeInTheDocument()
    expect(screen.getByTestId('remotion-player')).toHaveAttribute('data-duration', '90')
  })

  it('reports zero keyframes when none are set', () => {
    render(<AnimationPreview canvasJson={{ background: 'full', elements: [] }} onClose={vi.fn()} />)
    expect(screen.getByText(/^0 keyframes/)).toBeInTheDocument()
  })

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn()
    render(<AnimationPreview canvasJson={{ background: 'full', elements: [] }} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', async () => {
    const onClose = vi.fn()
    render(<AnimationPreview canvasJson={{ background: 'full', elements: [] }} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
