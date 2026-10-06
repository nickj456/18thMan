import type { CanvasState } from './types'

/**
 * Undo history for the drill designer, kept as ONE value so that the entries
 * and the cursor can never disagree.
 *
 * The previous implementation held them in two useState slots and advanced the
 * cursor with a closure over the old index. Two pushes in the same tick (a
 * Konva drag-end plus the draw tool's mouse-up, when a drag gesture starts on
 * top of a piece) each saw the same stale index: the entries grew by one, the
 * cursor by two, and `entries[index]` became undefined, crashing the render.
 */
export interface HistoryState {
  entries: CanvasState[]
  index: number
}

export const MAX_HISTORY = 50

export function createHistory(initial: CanvasState): HistoryState {
  return { entries: [initial], index: 0 }
}

/** Append a state after the cursor, dropping any redo tail and the oldest entries past MAX_HISTORY. */
export function pushHistory(h: HistoryState, next: CanvasState): HistoryState {
  const entries = [...h.entries.slice(0, h.index + 1), next].slice(-MAX_HISTORY)
  return { entries, index: entries.length - 1 }
}

export function undoHistory(h: HistoryState): HistoryState {
  return h.index === 0 ? h : { ...h, index: h.index - 1 }
}

export function canUndo(h: HistoryState): boolean {
  return h.index > 0
}

/** The state the designer should show. Always defined: the cursor is clamped to the entries. */
export function currentState(h: HistoryState): CanvasState {
  return h.entries[Math.min(h.index, h.entries.length - 1)]
}
