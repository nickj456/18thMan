import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TierBadge } from './TierBadge'

describe('TierBadge', () => {
  it('labels free as "Free"', () => {
    render(<TierBadge tier="free" />)
    expect(screen.getByText('Free')).toBeInTheDocument()
  })

  it('labels trial as "Trial"', () => {
    render(<TierBadge tier="trial" />)
    expect(screen.getByText('Trial')).toBeInTheDocument()
  })

  it('labels the coach tier as "Coach Pro", never bare "Coach"', () => {
    render(<TierBadge tier="coach" />)
    expect(screen.getByText('Coach Pro')).toBeInTheDocument()
    expect(screen.queryByText('Coach')).not.toBeInTheDocument()
  })

  it('labels club as "Club"', () => {
    render(<TierBadge tier="club" />)
    expect(screen.getByText('Club')).toBeInTheDocument()
  })
})
