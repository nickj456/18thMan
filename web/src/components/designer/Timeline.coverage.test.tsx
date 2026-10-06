import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Timeline } from './Timeline'
import type { CanvasElement, CanvasState } from './types'

function setup(state: CanvasState, overrides: Partial<React.ComponentProps<typeof Timeline>> = {}) {
  const props: React.ComponentProps<typeof Timeline> = {
    state,
    currentFrame: 0,
    isPlaying: false,
    onFrameChange: vi.fn(),
    onAddKeyframe: vi.fn(),
    onDeleteKeyframe: vi.fn(),
    onTogglePlay: vi.fn(),
    onDurationChange: vi.fn(),
    ...overrides,
  }
  const view = render(<Timeline {...props} />)
  return { props, ...view }
}

const cones = (n: number): CanvasElement[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, type: 'cone', x: i, y: i }))

function stubRect(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, width: 300, top: 0, right: 300, bottom: 24, height: 24, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
}

describe('Timeline (coverage)', () => {
  it('shows an overflow notice past six rows', () => {
    setup({ background: 'full', elements: cones(8) })
    expect(screen.getByText('+2 more (all animated)')).toBeInTheDocument()
  })

  it('has no overflow notice at exactly six rows', () => {
    setup({ background: 'full', elements: cones(6) })
    expect(screen.queryByText(/more \(all animated\)/)).not.toBeInTheDocument()
  })

  it('labels defenders, unlabelled players, text and equipment rows', () => {
    setup({
      background: 'full',
      elements: [
        { id: 'd', type: 'defender', x: 0, y: 0, label: '7' },
        { id: 'a', type: 'attacker', x: 0, y: 0 },
        { id: 't1', type: 'text', x: 0, y: 0, label: 'Gain line' },
        { id: 't2', type: 'text', x: 0, y: 0 },
        { id: 'l', type: 'agility-ladder', x: 0, y: 0 },
      ],
    })
    expect(screen.getByText('Def 7')).toBeInTheDocument()
    expect(screen.getByText('Att')).toBeInTheDocument()
    expect(screen.getByText('Gain line')).toBeInTheDocument()
    expect(screen.getByText('Label')).toBeInTheDocument()
    expect(screen.getByText('Agility ladder')).toBeInTheDocument()
  })

  it('pauses playback and seeks when the ruler is pressed, clamping drags', () => {
    const { props, container } = setup(
      { background: 'full', elements: cones(1), duration: 90 },
      { isPlaying: true },
    )
    const ruler = container.querySelector('.cursor-crosshair') as HTMLElement
    stubRect(ruler)
    fireEvent.mouseDown(ruler, { clientX: 150 })
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1)
    expect(props.onFrameChange).toHaveBeenCalledWith(45)
    fireEvent.mouseMove(window, { clientX: 900 })
    expect(props.onFrameChange).toHaveBeenLastCalledWith(90)
    fireEvent.mouseUp(window)
    fireEvent.mouseMove(window, { clientX: 0 })
    expect(props.onFrameChange).toHaveBeenCalledTimes(2)
  })

  it('does not toggle playback when seeking while paused', () => {
    const { props, container } = setup({ background: 'full', elements: [], duration: 90 })
    const ruler = container.querySelector('.cursor-crosshair') as HTMLElement
    stubRect(ruler)
    fireEvent.mouseDown(ruler, { clientX: -50 })
    expect(props.onTogglePlay).not.toHaveBeenCalled()
    expect(props.onFrameChange).toHaveBeenCalledWith(0)
    fireEvent.mouseUp(window)
  })
})
