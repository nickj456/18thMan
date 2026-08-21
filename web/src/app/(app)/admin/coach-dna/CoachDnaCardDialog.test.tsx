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
})
