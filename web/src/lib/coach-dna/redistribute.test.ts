import { describe, it, expect } from 'vitest'
import { redistributeWeights } from './redistribute'
import { getCategoryWeights } from './config'
import type { ScoreSource } from './config'

describe('redistributeWeights', () => {
  it('returns the original weights unchanged when all sources are active', () => {
    const weights = getCategoryWeights('teacher')
    const active: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']
    expect(redistributeWeights(weights, active)).toEqual({
      self: 25,
      player_voice: 35,
      peer_observation: 30,
      parent_voice: 10,
    })
  })

  it('redistributes proportionally, not evenly, when one source is missing', () => {
    const weights = getCategoryWeights('teacher') // self 25 / player 35 / peer 30 / parent 10
    const active: ScoreSource[] = ['self', 'player_voice', 'peer_observation']
    const result = redistributeWeights(weights, active)
    // active weight sum = 25 + 35 + 30 = 90; each scaled by 100/90
    expect(result.self).toBeCloseTo((25 / 90) * 100, 5)
    expect(result.player_voice).toBeCloseTo((35 / 90) * 100, 5)
    expect(result.peer_observation).toBeCloseTo((30 / 90) * 100, 5)
    expect(result.parent_voice).toBeUndefined()
    // proportional, not even — player_voice (originally largest) must still be largest after redistribution
    expect(result.player_voice!).toBeGreaterThan(result.self!)
    expect(result.player_voice!).toBeGreaterThan(result.peer_observation!)
  })

  it('redistributes across two sources when two are missing', () => {
    const weights = getCategoryWeights('teacher')
    const active: ScoreSource[] = ['player_voice', 'peer_observation']
    const result = redistributeWeights(weights, active)
    expect(result.player_voice).toBeCloseTo((35 / 65) * 100, 5)
    expect(result.peer_observation).toBeCloseTo((30 / 65) * 100, 5)
  })

  it('every weight configuration sums to 100 across every non-empty active-source subset with nonzero weight', () => {
    const allSources: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']
    const subsets: ScoreSource[][] = [
      allSources,
      ['self', 'player_voice', 'peer_observation'],
      ['self', 'player_voice', 'parent_voice'],
      ['self', 'peer_observation', 'parent_voice'],
      ['player_voice', 'peer_observation', 'parent_voice'],
      ['self', 'player_voice'],
      ['player_voice', 'peer_observation'],
    ]
    for (const slug of ['teacher', 'technician', 'culture-builder']) {
      const weights = getCategoryWeights(slug)
      for (const subset of subsets) {
        const activeWeightSum = subset.reduce((sum, s) => sum + weights[s], 0)
        if (activeWeightSum === 0) continue // covered by the zero-weight test below
        const result = redistributeWeights(weights, subset)
        const total = Object.values(result).reduce((a, b) => a + (b ?? 0), 0)
        expect(total).toBeCloseTo(100, 5)
      }
    }
  })

  it('returns an empty object when every active source has zero configured weight', () => {
    const weights = getCategoryWeights('technician') // parent_voice: 0
    const result = redistributeWeights(weights, ['parent_voice'])
    expect(result).toEqual({})
  })
})
