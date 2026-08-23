import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CoachDnaCardDialog } from './CoachDnaCardDialog'

describe('CoachDnaCardDialog', () => {
  it('shows the trigger button and keeps the dialog closed initially', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    expect(screen.getByRole('button', { name: 'View my Coach DNA card' })).toBeInTheDocument()
    expect(screen.queryByAltText('Your Coach DNA card')).not.toBeInTheDocument()
  })

  it('opens the dialog with the card image and a download link on click', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'View my Coach DNA card' }))

    const img = screen.getByAltText('Your Coach DNA card') as HTMLImageElement
    expect(img.src).toContain('/api/coach-dna/card-image/attempt-1')

    const downloadLink = screen.getByRole('link', { name: 'Download' })
    expect(downloadLink).toHaveAttribute('href', '/api/coach-dna/card-image/attempt-1')
    expect(downloadLink).toHaveAttribute('download', 'coach-dna-card.png')
  })

  it('shows a loading indicator before the image finishes loading, and hides it after onLoad fires', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'View my Coach DNA card' }))

    const img = screen.getByAltText('Your Coach DNA card') as HTMLImageElement
    // Loading indicator is present, error message is not, before onLoad fires.
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText(/Couldn't load your Coach DNA card/)).not.toBeInTheDocument()

    fireEvent.load(img)

    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    expect(screen.queryByText(/Couldn't load your Coach DNA card/)).not.toBeInTheDocument()
    // The download link keeps working regardless of image load state.
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/coach-dna/card-image/attempt-1',
    )
  })

  it('shows a retry-friendly error message after the image fails to load', () => {
    render(<CoachDnaCardDialog attemptId="attempt-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'View my Coach DNA card' }))

    const img = screen.getByAltText('Your Coach DNA card') as HTMLImageElement
    fireEvent.error(img)

    expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    expect(screen.getByText(/Couldn't load your Coach DNA card/)).toBeInTheDocument()
    // The download link still works even though the image failed.
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
      'href',
      '/api/coach-dna/card-image/attempt-1',
    )
  })
})
