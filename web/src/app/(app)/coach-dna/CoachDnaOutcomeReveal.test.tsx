import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoachDnaOutcomeReveal } from './CoachDnaOutcomeReveal'

describe('CoachDnaOutcomeReveal', () => {
  it('shows the trigger and no download links initially', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-1" />)
    expect(screen.getByRole('button', { name: /Download your Coach DNA report/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Your Coach DNA Report' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Feedback Summary' })).not.toBeInTheDocument()
  })

  it('reveals both download links on click, with the right hrefs and download filenames', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Download your Coach DNA report/ }))

    expect(screen.queryByRole('button', { name: /Download your Coach DNA report/ })).not.toBeInTheDocument()

    const reportLink = screen.getByRole('link', { name: 'Your Coach DNA Report' })
    expect(reportLink).toHaveAttribute('href', '/api/coach-dna/report-pdf/attempt-1')
    expect(reportLink).toHaveAttribute('download', 'coach-dna-outcome.pdf')

    const feedbackLink = screen.getByRole('link', { name: 'Feedback Summary' })
    expect(feedbackLink).toHaveAttribute('href', '/api/coach-dna/feedback-summary-pdf/attempt-1')
    expect(feedbackLink).toHaveAttribute('download', 'coach-dna-feedback-summary.pdf')
  })

  it('uses the given attemptId in both download URLs', () => {
    render(<CoachDnaOutcomeReveal attemptId="attempt-xyz" />)
    fireEvent.click(screen.getByRole('button', { name: /Download your Coach DNA report/ }))

    expect(screen.getByRole('link', { name: 'Your Coach DNA Report' })).toHaveAttribute(
      'href', '/api/coach-dna/report-pdf/attempt-xyz',
    )
    expect(screen.getByRole('link', { name: 'Feedback Summary' })).toHaveAttribute(
      'href', '/api/coach-dna/feedback-summary-pdf/attempt-xyz',
    )
  })
})
