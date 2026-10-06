import type { ToolType } from './types'
import { toolForKey } from './tools'

/**
 * Pure key-to-action mapping for the drill designer's window keydown listener,
 * kept out of the component so the guards can be unit-tested without Konva.
 */
export type DesignerKeyAction =
  | { type: 'delete' }
  | { type: 'undo' }
  | { type: 'cancel' }
  | { type: 'tool'; tool: ToolType }

export interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  repeat: boolean
  target: EventTarget | null
}

/**
 * Shortcuts only fire when focus is on the page itself (nothing focused) or on
 * something inside the designer canvas area. Anything else (the details form,
 * the timeline, a sidebar menu, the upgrade modal, a portalled select) keeps
 * its own keys, so typing never switches tools or deletes a piece behind it.
 */
export function isDesignerKeyTarget(target: EventTarget | null, root: Element | null): boolean {
  if (!(target instanceof Element)) return true
  if (target === document.body || target === document.documentElement) return true
  if (!root || !root.contains(target)) return false
  const el = target as HTMLElement
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable) return false
  return true
}

export function resolveDesignerKey(e: KeyLike, root: Element | null): DesignerKeyAction | null {
  if (!isDesignerKeyTarget(e.target, root)) return null

  if (e.key === 'Delete' || e.key === 'Backspace') return { type: 'delete' }

  const mod = e.ctrlKey || e.metaKey
  // Lower-case so Caps Lock doesn't break undo; Shift+Z is redo elsewhere, and
  // there is no redo here, so ignore it rather than undoing a second time.
  if (mod && e.key.toLowerCase() === 'z') return e.shiftKey ? null : { type: 'undo' }

  if (e.key === 'Escape') return { type: 'cancel' }

  if (!mod && !e.altKey && !e.repeat) {
    const tool = toolForKey(e.key)
    if (tool) return { type: 'tool', tool }
  }
  return null
}
