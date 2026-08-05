import type { CategoryWeightConfig, ScoreSource } from './config'

export function redistributeWeights(
  weights: CategoryWeightConfig,
  activeSources: ScoreSource[],
): Partial<Record<ScoreSource, number>> {
  const activeWeightSum = activeSources.reduce((sum, s) => sum + weights[s], 0)
  if (activeWeightSum === 0) return {}

  const result: Partial<Record<ScoreSource, number>> = {}
  for (const s of activeSources) {
    result[s] = (weights[s] / activeWeightSum) * 100
  }
  return result
}
