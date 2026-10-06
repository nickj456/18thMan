/* eslint-disable @next/next/no-html-link-for-pages -- the harness renders raw anchors on purpose: the guard works at the document level, for Link and plain <a> alike */
import { render, renderHook, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from './useUnsavedChangesGuard'

afterEach(() => {
  vi.restoreAllMocks()
})

function Harness({ dirty, onReady }: { dirty: boolean; onReady?: (allow: () => void) => void }) {
  const allow = useUnsavedChangesGuard(dirty)
  onReady?.(allow)
  return (
    <>
      <a href="/drills">Drills</a>
      <a href="/drills" target="_blank">New tab</a>
      <a href="https://example.com/x">External</a>
    </>
  )
}

/** Fires a click and reports whether the guard cancelled it. */
function click(el: Element, init: MouseEventInit = {}) {
  const ev = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })
  el.dispatchEvent(ev)
  return ev.defaultPrevented
}

describe('useUnsavedChangesGuard', () => {
  it('does nothing while there are no unsaved changes', () => {
    const confirm = vi.spyOn(window, 'confirm')
    render(<Harness dirty={false} />)
    expect(click(screen.getByText('Drills'))).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('cancels an in-app link when the coach chooses to stay', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Harness dirty />)
    expect(click(screen.getByText('Drills'))).toBe(true)
    expect(confirm).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE)
  })

  it('lets the link through when the coach confirms leaving', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<Harness dirty />)
    expect(click(screen.getByText('Drills'))).toBe(false)
  })

  it('ignores new-tab, modified and external clicks', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Harness dirty />)
    expect(click(screen.getByText('New tab'))).toBe(false)
    expect(click(screen.getByText('Drills'), { metaKey: true })).toBe(false)
    expect(click(screen.getByText('External'))).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('stops prompting after allowNavigation (e.g. right after a successful save)', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    let allow: () => void = () => {}
    render(<Harness dirty onReady={(a) => { allow = a }} />)
    allow()
    expect(click(screen.getByText('Drills'))).toBe(false)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('arms the browser beforeunload prompt only while dirty', () => {
    const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), { initialProps: { dirty: true } })
    const armed = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(armed)
    expect(armed.defaultPrevented).toBe(true)

    rerender({ dirty: false })
    const disarmed = new Event('beforeunload', { cancelable: true })
    fireEvent(window, disarmed)
    expect(disarmed.defaultPrevented).toBe(false)
  })
})
