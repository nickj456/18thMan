import { SOURCES, SOURCE_LABELS, type CategoryWeightConfig, type ScoreSource } from './config'

const DEFAULT_MAX_SCORE_DELTA = 15

export function applyScoreChangeLimit(
  previousScore: number | null,
  newScore: number,
  maxDelta: number = DEFAULT_MAX_SCORE_DELTA,
): number {
  if (previousScore === null) return newScore
  const delta = newScore - previousScore
  if (delta > maxDelta) return previousScore + maxDelta
  if (delta < -maxDelta) return previousScore - maxDelta
  return newScore
}

export function buildInsufficientDataMessage(
  sampleSizes: Record<ScoreSource, number>,
  thresholds: CategoryWeightConfig,
  weights: CategoryWeightConfig,
): string {
  const inactive = SOURCES.filter(s => sampleSizes[s] < thresholds[s])
  if (inactive.length === 0) return 'Not enough responses yet to calculate this score.'

  const target = inactive.reduce((best, s) => (weights[s] > weights[best] ? s : best), inactive[0])
  const needed = Math.max(thresholds[target] - sampleSizes[target], 1)
  const noun = needed === 1 ? 'response' : 'responses'
  return `Get ${needed} more ${SOURCE_LABELS[target]} ${noun} to unlock this score.`
}
