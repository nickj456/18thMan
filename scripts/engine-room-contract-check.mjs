// Contract smoke test: build a match payload the way the app does, then run it through Engine Room's real parser.
// Read-only towards er-matches. Run: npx tsx scripts/engine-room-contract-check.mjs
import { buildMatchPayload } from '../src/renderer/utils/engineRoom.js'
import { parseAnalystMatch } from 'file:///C:/Users/nickj/er-matches/lib/analyst.ts'

const today = new Date().toISOString().slice(0, 10)
const players = [
  { id: 1, number: 1, name: 'Leo', engineRoomId: '3f2b8c1e-7d4a-4e9b-9a51-2c6f0d8e1b77', isOpposition: false },
  { id: 2, number: 11, name: 'J. Smith', engineRoomId: null, isOpposition: false },
]
const ev = (playerId, statKey, meterage) => ({ playerId, statKey, ...(meterage !== undefined ? { meterage } : {}) })
const events = [
  ev(1, 'carry', 8), ev(1, 'carry', 12), ev(1, 'tackle'), ev(1, 'tackle'), ev(1, 'try'),
  ev(2, 'carry', 5), ev('opp', 'try'),
]
const info = { opposition: 'Hunslet', date: today, ourScore: '24', oppScore: '18' }

const payload = buildMatchPayload('lx2abc', info, players, events)
console.log('PAYLOAD', JSON.stringify(payload))
console.log('ACCEPTED', JSON.stringify(parseAnalystMatch(payload, today)))

try {
  parseAnalystMatch(buildMatchPayload('lx2abc', { ...info, opposition: '' }, players, events), today)
  console.log('BAD PAYLOAD WAS NOT REJECTED')
  process.exitCode = 1
} catch (e) {
  console.log('REJECTED (expected):', e.message)
}
