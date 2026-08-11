import { Component, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuestionOptions } from './QuestionOptions'

// Minimal error boundary so a real (uncaught) redirect-style throw from
// unstable_rethrow doesn't surface as an unhandled test-runner exception —
// React 19 propagates async-transition throws to the nearest boundary, which
// is exactly what would happen in the real app's route error boundary too.
class TestErrorBoundary extends Component<{ children: ReactNode }, { threw: boolean }> {
  state = { threw: false }
  static getDerivedStateFromError() {
    return { threw: true }
  }
  render() {
    return this.state.threw ? <p>boundary-caught</p> : this.props.children
  }
}

const answerQuestionMock = vi.fn()

vi.mock('./actions', () => ({
  answerQuestion: (...args: unknown[]) => answerQuestionMock(...args),
}))

const options = [
  { id: 'opt-a', optionText: 'Option A' },
  { id: 'opt-b', optionText: 'Option B' },
]

async function pickBothAndContinue() {
  const user = userEvent.setup()
  render(
    <QuestionOptions
      attemptId="attempt-1"
      questionId="q1"
      options={options}
      initialMostId={null}
      initialLeastId={null}
    />,
  )

  await user.click(screen.getByText('Option A'))
  await user.click(screen.getByText('Option B'))
  await user.click(screen.getByRole('button', { name: /continue/i }))
  return user
}

describe('QuestionOptions', () => {
  beforeEach(() => {
    answerQuestionMock.mockReset()
  })

  it('shows a visible error and re-enables Continue when the save fails', async () => {
    answerQuestionMock.mockRejectedValue(new Error('network down'))

    await pickBothAndContinue()

    expect(
      await screen.findByText('Something went wrong saving your answer. Please try again.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled()
  })

  it('awaits the save before flipping isPending back off, so the button briefly disables on click', async () => {
    let resolveAnswer: () => void = () => {}
    answerQuestionMock.mockReturnValue(
      new Promise<void>(resolve => {
        resolveAnswer = resolve
      }),
    )

    const user = userEvent.setup()
    render(
      <QuestionOptions
        attemptId="attempt-1"
        questionId="q1"
        options={options}
        initialMostId={null}
        initialLeastId={null}
      />,
    )
    await user.click(screen.getByText('Option A'))
    await user.click(screen.getByText('Option B'))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    resolveAnswer()
    await waitFor(() => expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled())
  })

  it('does not swallow a NEXT_REDIRECT-style throw from a successful save as a user-facing error', async () => {
    const redirectError = new Error('NEXT_REDIRECT') as Error & { digest: string }
    redirectError.digest = 'NEXT_REDIRECT;push;/admin/coach-dna/assessment/attempt-1?q=q2;307;'
    answerQuestionMock.mockRejectedValue(redirectError)

    const user = userEvent.setup()
    render(
      <TestErrorBoundary>
        <QuestionOptions
          attemptId="attempt-1"
          questionId="q1"
          options={options}
          initialMostId={null}
          initialLeastId={null}
        />
      </TestErrorBoundary>,
    )
    await user.click(screen.getByText('Option A'))
    await user.click(screen.getByText('Option B'))
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // unstable_rethrow re-throws Next.js redirect/notFound digests instead of
    // swallowing them as a real failure — it propagates past our try/catch,
    // which is why a real render tree would navigate rather than show an
    // error message (here it reaches the boundary instead).
    await waitFor(() => expect(screen.getByText('boundary-caught')).toBeInTheDocument())
    expect(
      screen.queryByText('Something went wrong saving your answer. Please try again.'),
    ).not.toBeInTheDocument()
  })
})
