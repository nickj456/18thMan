// Pure helpers for the Engine Room link: squad -> players, tagged session -> match payload.

export const ENGINE_ROOM_KEYS = [
  'try', 'tackle', 'missed_tackle', 'carry', 'line_break', 'support', 'offload', 'kick',
  'penalty_won', 'penalty_con', 'error', 'intercept', 'ruck_win', 'ruck_loss',
  'ptb_fast', 'ptb_slow', 'involvement_pos', 'involvement_neg', 'marker_tackle',
]

// Engine Room rejects counts above these, so we clamp. A real match can never reach them.
const MAX_COUNT = 200
const MAX_METRES = 2000

const MATCH_INFO_MESSAGE = 'Add the opposition and date in Match Info first.'

export function squadToPlayers(squad, pickedIds) {
  const picked = new Set(pickedIds)
  return squad
    .filter((s) => picked.has(s.id))
    .map((s, i) => ({
      id: i + 1,
      number: i + 1,
      name: s.name,
      engineRoomId: s.id,
      comments: '',
      coachScore: null,
      parentEmail: '',
      isOpposition: false,
    }))
}

export function canReplaceSquad(events) {
  return !(events || []).some((e) => e.playerId !== 'opp')
}

export function matchInfoProblem(matchInfo) {
  const opposition = String(matchInfo?.opposition ?? '').trim()
  const date = String(matchInfo?.date ?? '').trim()
  if (!opposition || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return MATCH_INFO_MESSAGE
  return null
}

function intOrNull(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export function buildMatchPayload(sessionId, matchInfo, players, events) {
  const known = new Set(ENGINE_ROOM_KEYS)
  return {
    ref: sessionId,
    opponent: String(matchInfo.opposition).trim(),
    playedOn: matchInfo.date,
    venue: null,
    ourScore: intOrNull(matchInfo.ourScore),
    theirScore: intOrNull(matchInfo.oppScore),
    players: players
      .filter((p) => !p.isOpposition && p.id !== 'opp')
      .map((p) => {
        const counts = Object.fromEntries(ENGINE_ROOM_KEYS.map((k) => [k, 0]))
        let metres = 0
        for (const e of events) {
          if (e.playerId !== p.id) continue
          if (known.has(e.statKey)) counts[e.statKey] += 1
          if (e.statKey === 'carry' && Number.isFinite(e.meterage)) metres += e.meterage
        }
        for (const k of ENGINE_ROOM_KEYS) counts[k] = Math.min(counts[k], MAX_COUNT)
        counts.metres = Math.min(Math.max(Math.round(metres), 0), MAX_METRES)
        return {
          engineRoomId: p.engineRoomId ?? null,
          name: p.name,
          number: intOrNull(p.number),
          counts,
        }
      }),
  }
}
