import { describe, it, expect } from 'vitest'
import { pickReducer, type PickState } from './pickReducer'

const empty: PickState = { mostId: null, leastId: null }

describe('pickReducer', () => {
  it('sets the first tap as "most"', () => {
    const result = pickReducer(empty, { type: 'tap', optionId: 'A' })
    expect(result).toEqual({ mostId: 'A', leastId: null })
  })

  it('sets the second tap (on a different option) as "least"', () => {
    const state: PickState = { mostId: 'A', leastId: null }
    const result = pickReducer(state, { type: 'tap', optionId: 'B' })
    expect(result).toEqual({ mostId: 'A', leastId: 'B' })
  })

  it('clears "most" when tapping the option currently marked most', () => {
    const state: PickState = { mostId: 'A', leastId: null }
    const result = pickReducer(state, { type: 'tap', optionId: 'A' })
    expect(result).toEqual({ mostId: null, leastId: null })
  })

  it('clears "least" when tapping the option currently marked least', () => {
    const state: PickState = { mostId: 'A', leastId: 'B' }
    const result = pickReducer(state, { type: 'tap', optionId: 'B' })
    expect(result).toEqual({ mostId: 'A', leastId: null })
  })

  it('reassigns "most" to a third option when both marks are already placed, leaving "least" untouched', () => {
    const state: PickState = { mostId: 'A', leastId: 'B' }
    const result = pickReducer(state, { type: 'tap', optionId: 'C' })
    expect(result).toEqual({ mostId: 'C', leastId: 'B' })
  })
})
