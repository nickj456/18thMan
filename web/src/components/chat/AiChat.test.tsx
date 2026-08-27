import { describe, it, expect, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'

/**
 * Regression coverage for the silent-failure bug: AiChat's onError handler
 * used to only surface "Daily limit"/"Upgrade" errors, so any other backend
 * failure (e.g. the Groq model outage on 2026-08-18) produced no visible
 * feedback at all — the user just saw nothing happen.
 */

type CapturedError = { message: string }
let capturedOnError: ((err: CapturedError) => void) | undefined

vi.mock('@ai-sdk/react', () => ({
  useChat: (opts: { onError?: (err: CapturedError) => void }) => {
    capturedOnError = opts.onError
    return { messages: [], status: 'ready', sendMessage: vi.fn() }
  },
}))

vi.mock('ai', () => ({
  DefaultChatTransport: class {},
}))

vi.mock('@/app/(app)/chat/actions', () => ({
  saveSessionFromChat: vi.fn(),
}))

vi.mock('@/app/(app)/groups/[id]/squad/actions', () => ({
  getSquadContextForGroup: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import { AiChat } from './AiChat'

// jsdom doesn't implement scrollIntoView, which AiChat calls to keep the
// message list pinned to the bottom on every render.
window.HTMLElement.prototype.scrollIntoView = vi.fn()

function renderChat() {
  render(
    <AiChat
      conversationId="conv-1"
      initialMessages={[]}
      userAvatar={null}
      userName={null}
    />
  )
}

describe('AiChat onError', () => {
  it('shows the server-provided error message for a non-daily-limit failure', () => {
    renderChat()
    expect(capturedOnError).toBeTypeOf('function')

    act(() => capturedOnError!({ message: JSON.stringify({ error: 'The model is currently unavailable.' }) }))

    expect(screen.getByText('The model is currently unavailable.')).toBeInTheDocument()
  })

  it('falls back to a generic message when the error body is not JSON', () => {
    renderChat()

    act(() => capturedOnError!({ message: 'Unauthorized' }))

    expect(screen.getByText('Something went wrong sending that message. Please try again.')).toBeInTheDocument()
  })

  it('still shows the upgrade prompt (not the generic banner) for daily-limit errors', () => {
    renderChat()

    act(() => capturedOnError!({ message: 'Daily limit reached (5 messages). Upgrade your club for unlimited AI chat.' }))

    expect(screen.getByText(/Upgrade your club for unlimited AI chat/)).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong sending that message. Please try again.')).not.toBeInTheDocument()
  })
})
