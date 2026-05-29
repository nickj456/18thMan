/**
 * Returns the consensus score for a player.
 * Averages the lead coach's personal score with all peer scores from squad reviews.
 * Returns null if no scores exist yet.
 * Returns an object: { value: 7.3, count: 3, hasPersonal: true, hasPeers: true }
 */
export function consensusScore(player) {
  const scores = []
  if (player?.coachScore != null) scores.push(player.coachScore)
  ;(player?.peerScores || []).forEach(ps => scores.push(ps.score))
  if (scores.length === 0) return null
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return {
    value:       Math.round(avg * 10) / 10,
    count:       scores.length,
    hasPersonal: player?.coachScore != null,
    hasPeers:    (player?.peerScores || []).length > 0,
    peerAvg:     (player?.peerScores || []).length > 0
      ? Math.round((player.peerScores.reduce((a, b) => a + b.score, 0) / player.peerScores.length) * 10) / 10
      : null,
  }
}

/** Render score dots as a string of ● characters for a given value out of 10 */
export function scoreDotsText(value, total = 10) {
  if (value == null) return null
  const filled = Math.round(value)
  return Array.from({ length: total }, (_, i) => i < filled ? '●' : '○').join('')
}
