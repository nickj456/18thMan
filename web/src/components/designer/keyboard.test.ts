import { describe, it, expect, beforeEach } from 'vitest'
import { isDesignerKeyTarget, resolveDesignerKey, type KeyLike } from './keyboard'

let root: HTMLDivElement
let outside: HTMLDivElement

beforeEach(() => {
  document.body.replaceChildren()
  root = document.createElement('div')
  outside = document.createElement('div')
  document.body.append(root, outside)
})

function key(k: string, opts: Partial<KeyLike> = {}): KeyLike {
  return { key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, target: document.body, ...opts }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, parent: Element = root) {
  const node = document.createElement(tag)
  parent.appendChild(node)
  return node
}

describe('isDesignerKeyTarget', () => {
  it('accepts the page body and buttons inside the designer', () => {
    expect(isDesignerKeyTarget(document.body, root)).toBe(true)
    expect(isDesignerKeyTarget(el('button'), root)).toBe(true)
  })

  it('rejects typing targets inside the designer', () => {
    expect(isDesignerKeyTarget(el('input'), root)).toBe(false)
    expect(isDesignerKeyTarget(el('textarea'), root)).toBe(false)
    expect(isDesignerKeyTarget(el('select'), root)).toBe(false)
    const editable = el('div')
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    expect(isDesignerKeyTarget(editable, root)).toBe(false)
  })

  it('rejects anything outside the designer (details form, timeline, menus, modals)', () => {
    expect(isDesignerKeyTarget(el('button', outside), root)).toBe(false)
    const dialog = el('div', outside)
    dialog.setAttribute('role', 'dialog')
    expect(isDesignerKeyTarget(el('button', dialog), root)).toBe(false)
  })

  it('rejects element targets when the designer root is not mounted', () => {
    expect(isDesignerKeyTarget(el('button'), null)).toBe(false)
  })
})

describe('resolveDesignerKey', () => {
  it('maps tool letters when focus is on the page', () => {
    expect(resolveDesignerKey(key('a'), root)).toEqual({ type: 'tool', tool: 'attacker' })
    expect(resolveDesignerKey(key('z'), root)).toEqual({ type: 'tool', tool: 'zone' })
  })

  it('never switches tools while typing in a field', () => {
    expect(resolveDesignerKey(key('a', { target: el('input') }), root)).toBeNull()
    expect(resolveDesignerKey(key('Backspace', { target: el('textarea') }), root)).toBeNull()
  })

  it('ignores tool letters with a modifier, Alt, or key repeat', () => {
    expect(resolveDesignerKey(key('a', { altKey: true }), root)).toBeNull()
    expect(resolveDesignerKey(key('a', { repeat: true }), root)).toBeNull()
    expect(resolveDesignerKey(key('a', { ctrlKey: true }), root)).toBeNull()
  })

  it('undoes on Ctrl+Z and Cmd+Z, including with Caps Lock, and does not select Zone', () => {
    expect(resolveDesignerKey(key('z', { ctrlKey: true }), root)).toEqual({ type: 'undo' })
    expect(resolveDesignerKey(key('z', { metaKey: true }), root)).toEqual({ type: 'undo' })
    expect(resolveDesignerKey(key('Z', { ctrlKey: true }), root)).toEqual({ type: 'undo' })
  })

  it('does not treat Shift+Cmd+Z (redo) as a second undo', () => {
    expect(resolveDesignerKey(key('z', { metaKey: true, shiftKey: true }), root)).toBeNull()
  })

  it('maps Delete, Backspace and Escape', () => {
    expect(resolveDesignerKey(key('Delete'), root)).toEqual({ type: 'delete' })
    expect(resolveDesignerKey(key('Backspace'), root)).toEqual({ type: 'delete' })
    expect(resolveDesignerKey(key('Escape'), root)).toEqual({ type: 'cancel' })
  })

  it('returns null for unmapped keys', () => {
    expect(resolveDesignerKey(key('q'), root)).toBeNull()
    expect(resolveDesignerKey(key('ArrowLeft'), root)).toBeNull()
  })
})
