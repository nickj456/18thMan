import { SOURCES, type CategoryWeightConfig, type ScoreSource } from './config'
import { redistributeWeights } from './redistribute'
import { computeRecencyWeightedAverage, capOutliers, type SourceResponse } from './response-scoring'
import { applyScoreChangeLimit, buildInsufficientDataMessage } from './limits'

export type { SourceResponse } from './response-scoring'
export type { ScoreSource, CategoryWeightConfig } from './config'

export interface SourceInput {
  source: ScoreSource
  responses: SourceResponse[]
}

export type CategoryScoreResult =
  | {
      status: 'scored'
      blendedScore: number
      sourceScores: Partial<Record<ScoreSource, number>>
    }
  | {
      status: 'insufficient_data'
      message: string
      sourceScores: Partial<Record<ScoreSource, number>>
    }

export function computeCategoryScore(
  inputs: SourceInput[],
  weights: CategoryWeightConfig,
  thresholds: CategoryWeightConfig,
  now: Date,
  previousScore: number | null = null,
): CategoryScoreResult {
  const sampleSizes: Record<ScoreSource, number> = {
    self: 0,
    player_voice: 0,
    peer_observation: 0,
    parent_voice: 0,
  }
  const sourceScores: Partial<Record<ScoreSource, number>> = {}

  for (const input of inputs) {
    sampleSizes[input.source] = input.responses.length
    if (input.responses.length === 0) continue
    const responses = input.source === 'peer_observation' ? capOutliers(input.responses) : input.responses
    sourceScores[input.source] = computeRecencyWeightedAverage(responses, now)
  }

  const activeSources = SOURCES.filter(s => sampleSizes[s] > 0 && sampleSizes[s] >= thresholds[s])

  if (activeSources.length < 2) {
    return {
      status: 'insufficient_data',
      message: buildInsufficientDataMessage(sampleSizes, thresholds, weights),
      sourceScores,
    }
  }

  const redistributed = redistributeWeights(weights, activeSources)
  const redistributedWeightSum = Object.values(redistributed).reduce((a, b) => a + (b ?? 0), 0)

  if (redistributedWeightSum === 0) {
    return {
      status: 'insufficient_data',
      message: buildInsufficientDataMessage(sampleSizes, thresholds, weights),
      sourceScores,
    }
  }

  const rawBlended = activeSources.reduce(
    (sum, s) => sum + (sourceScores[s] ?? 0) * (redistributed[s] ?? 0) / 100,
    0,
  )
  const blendedScore = applyScoreChangeLimit(previousScore, rawBlended)

  return { status: 'scored', blendedScore, sourceScores }
}
