// ── Sources ──────────────────────────────────────────────────────────────

export type ScoreSource = 'self' | 'player_voice' | 'peer_observation' | 'parent_voice'

export const SOURCES: ScoreSource[] = ['self', 'player_voice', 'peer_observation', 'parent_voice']

export const SOURCE_LABELS: Record<ScoreSource, string> = {
  self: 'Self-Assessment',
  player_voice: 'Player Voice',
  peer_observation: 'Peer Coach',
  parent_voice: 'Parent Voice',
}

// ── Weight configuration ────────────────────────────────────────────────

export interface CategoryWeightConfig {
  self: number
  player_voice: number
  peer_observation: number
  parent_voice: number
}

const DEFAULT_WEIGHTS: CategoryWeightConfig = {
  self: 25,
  player_voice: 35,
  peer_observation: 30,
  parent_voice: 10,
}

const WEIGHT_OVERRIDES: Record<string, CategoryWeightConfig> = {
  technician: { self: 25, player_voice: 15, peer_observation: 60, parent_voice: 0 },
  'culture-builder': { self: 15, player_voice: 40, peer_observation: 25, parent_voice: 20 },
}

export function getCategoryWeights(categorySlug: string): CategoryWeightConfig {
  return WEIGHT_OVERRIDES[categorySlug] ?? DEFAULT_WEIGHTS
}

// ── Minimum response thresholds ─────────────────────────────────────────

const DEFAULT_THRESHOLDS: CategoryWeightConfig = {
  self: 1,
  player_voice: 3,
  peer_observation: 1,
  parent_voice: 3,
}

const THRESHOLD_OVERRIDES: Record<string, CategoryWeightConfig> = {}

export function getSourceThresholds(categorySlug: string): CategoryWeightConfig {
  return THRESHOLD_OVERRIDES[categorySlug] ?? DEFAULT_THRESHOLDS
}
