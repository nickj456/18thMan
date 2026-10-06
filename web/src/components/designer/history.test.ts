import { describe, it, expect } from 'vitest'
import { MAX_HISTORY, canUndo, createHistory, currentState, pushHistory, undoHistory } from './history'
import type { CanvasState } from './types'

const base: CanvasState = { background: 'full', elements: [] }
const withElements = (n: number): CanvasState => ({
  background: 'full',
  elements: Array.from({ length: n }, (_, i) => ({ id: `e${i}`, type: 'cone', x: i, y: i })),
})

describe('designer undo history', () => {
  it('starts on the initial state with nothing to undo', () => {
    const h = createHistory(base)
    expect(currentState(h)).toBe(base)
    expect(canUndo(h)).toBe(false)
  })

  it('keeps the cursor on the newest entry after a push', () => {
    const h = pushHistory(createHistory(base), withElements(1))
    expect(h.entries).toHaveLength(2)
    expect(h.index).toBe(1)
    expect(currentState(h).elements).toHaveLength(1)
    expect(canUndo(h)).toBe(true)
  })

  // Regression: a drag-end and a draw mouse-up in the same tick used to advance
  // the cursor twice while adding one entry, leaving currentState undefined.
  it('stays consistent when two pushes are applied back to back', () => {
    let h = createHistory(base)
    h = pushHistory(h, withElements(1))
    h = pushHistory(h, withElements(2))
    expect(h.index).toBe(h.entries.length - 1)
    expect(currentState(h)).toBeDefined()
    expect(currentState(h).elements).toHaveLength(2)
  })

  it('undo steps back one entry and stops at the start', () => {
    let h = pushHistory(pushHistory(createHistory(base), withElements(1)), withElements(2))
    h = undoHistory(h)
    expect(currentState(h).elements).toHaveLength(1)
    h = undoHistory(h)
    expect(currentState(h)).toBe(base)
    expect(canUndo(h)).toBe(false)
    expect(undoHistory(h)).toBe(h)
  })

  it('discards the redo tail when pushing after an undo', () => {
    let h = pushHistory(pushHistory(createHistory(base), withElements(1)), withElements(2))
    h = undoHistory(h)
    h = pushHistory(h, withElements(3))
    expect(h.entries.map(e => e.elements.length)).toEqual([0, 1, 3])
    expect(h.index).toBe(2)
  })

  it('caps the history at MAX_HISTORY entries and keeps the cursor valid', () => {
    let h = createHistory(base)
    for (let i = 1; i <= MAX_HISTORY + 10; i++) h = pushHistory(h, withElements(i))
    expect(h.entries).toHaveLength(MAX_HISTORY)
    expect(h.index).toBe(MAX_HISTORY - 1)
    expect(currentState(h).elements).toHaveLength(MAX_HISTORY + 10)
  })
})
