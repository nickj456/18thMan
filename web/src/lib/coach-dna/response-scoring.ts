export interface SourceResponse {
  value: number // 0-100 normalized contribution from a single response
  submittedAt: string // ISO timestamp
}

const RECENCY_HALF_LIFE_DAYS = 90

export function computeRecencyWeightedAverage(responses: SourceResponse[], now: Date): number {
  const validResponses = responses.filter(
    r => Number.isFinite(r.value) && Number.isFinite(new Date(r.submittedAt).getTime())
  )
  if (validResponses.length === 0) return 0

  let weightedSum = 0
  let totalWeight = 0
  for (const r of validResponses) {
    const ageDays = (now.getTime() - new Date(r.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
    const weight = Math.pow(0.5, Math.max(ageDays, 0) / RECENCY_HALF_LIFE_DAYS)
    weightedSum += r.value * weight
    totalWeight += weight
  }
  return totalWeight === 0 ? 0 : weightedSum / totalWeight
}

const DEFAULT_MAX_DEVIATION_FROM_MEDIAN = 25

export function capOutliers(
  responses: SourceResponse[],
  maxDeviationFromMedian: number = DEFAULT_MAX_DEVIATION_FROM_MEDIAN,
): SourceResponse[] {
  if (responses.length < 3) return responses

  const sortedValues = [...responses.map(r => r.value)].sort((a, b) => a - b)
  const mid = Math.floor(sortedValues.length / 2)
  const median = sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid]

  return responses.map(r => {
    const deviation = r.value - median
    if (Math.abs(deviation) > maxDeviationFromMedian) {
      const cappedValue = median + Math.sign(deviation) * maxDeviationFromMedian
      return { ...r, value: cappedValue }
    }
    return r
  })
}
