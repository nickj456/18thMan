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

export const REPLACE_SQUAD_MESSAGE = 'Get the squad before you start tagging. Your tags are linked to the current players.'
export const SAME_NAME_WARNING = 'Same name as another player: check the nickname in Engine Room'

// Display label for one row of the "From Engine Room" picker.
export function squadRowLabel({ name, position, sameName }) {
  if (!sameName) return { text: name, warning: null }
  return { text: `${name} (${position === 'forward' ? 'F' : 'B'})`, warning: SAME_NAME_WARNING }
}

// What a saved squad template keeps. engineRoomId must survive so a reloaded squad stays linked.
export function templatePlayers(players) {
  return players
    .filter((p) => !p.isOpposition)
    .map((p) => ({ id: p.id, number: p.number, name: p.name, engineRoomId: p.engineRoomId ?? null }))
}

// A hand-added player: full default shape, no engineRoomId (Engine Room will ask who he is).
export function newPlayer(number, name, id) {
  return {
    id, number, name: String(name).trim(), engineRoomId: null,
    comments: '', coachScore: null, parentEmail: '', isOpposition: false,
  }
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

export const UNSAVED_MESSAGE = 'Save the session first (💾) so Engine Room can recognise it if you send it again.'
export const SEND_CONFIRM_MESSAGE = 'Send to Engine Room? This replaces anything already sent for this match, including any changes a coach made there. A coach checks it and releases it to the players.'

// Decides whether the Send button may go ahead: { ok: false, message } to show, or { ok: true, confirm } to ask.
export function sendCheck(sessionId, matchInfo) {
  if (!sessionId) return { ok: false, message: UNSAVED_MESSAGE }
  const problem = matchInfoProblem(matchInfo)
  if (problem) return { ok: false, message: problem }
  return { ok: true, confirm: SEND_CONFIRM_MESSAGE }
}

// The notice after a good send; `unknown` is how many players had no Engine Room link.
export function sendSuccessMessage({ message, unknown }) {
  if (!(unknown > 0)) return message
  return `${message} ${unknown} ${unknown === 1 ? 'player' : 'players'} without an Engine Room link: a coach will match them up.`
}
