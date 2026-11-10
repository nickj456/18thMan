import { describe, it, expect } from 'vitest'
import {
  ENGINE_ROOM_KEYS,
  squadToPlayers,
  canReplaceSquad,
  matchInfoProblem,
  buildMatchPayload,
  squadRowLabel,
  templatePlayers,
  newPlayer,
  REPLACE_SQUAD_MESSAGE,
  SAME_NAME_WARNING,
} from './engineRoom.js'

const info = { club: 'X', opposition: ' Rivals ', date: '2026-11-07', ourScore: '24', oppScore: '10' }

describe('ENGINE_ROOM_KEYS', () => {
  it('has the 19 count keys', () => {
    expect(ENGINE_ROOM_KEYS).toHaveLength(19)
    expect(ENGINE_ROOM_KEYS).toContain('marker_tackle')
    expect(ENGINE_ROOM_KEYS).not.toContain('metres')
  })
})

describe('squadToPlayers', () => {
  const squad = [
    { id: 'a', name: 'Leo' },
    { id: 'b', name: 'Sam' },
    { id: 'c', name: 'Joe' },
  ]
  it('keeps squad order, filters to picked, numbers 1..N', () => {
    const out = squadToPlayers(squad, ['c', 'a'])
    expect(out).toEqual([
      { id: 1, number: 1, name: 'Leo', engineRoomId: 'a', comments: '', coachScore: null, parentEmail: '', isOpposition: false },
      { id: 2, number: 2, name: 'Joe', engineRoomId: 'c', comments: '', coachScore: null, parentEmail: '', isOpposition: false },
    ])
  })
  it('returns an empty list when nobody is picked', () => {
    expect(squadToPlayers(squad, [])).toEqual([])
  })
  it('keeps the (F)/(B) label as the name so same-name lads stay distinct on the cards', () => {
    const twins = [
      { id: 'f', name: 'Sam', position: 'forward', sameName: true },
      { id: 'b', name: 'Sam', position: 'back', sameName: true },
      { id: 'x', name: 'Leo', position: 'back', sameName: false },
    ]
    expect(squadToPlayers(twins, ['f', 'b', 'x']).map((p) => [p.name, p.engineRoomId])).toEqual([
      ['Sam (F)', 'f'], ['Sam (B)', 'b'], ['Leo', 'x'],
    ])
  })
})

describe('canReplaceSquad', () => {
  it('is true with no events', () => expect(canReplaceSquad([])).toBe(true))
  it('is true with opposition-only events', () =>
    expect(canReplaceSquad([{ playerId: 'opp', statKey: 'carry' }])).toBe(true))
  it('is false once a home player is tagged', () =>
    expect(canReplaceSquad([{ playerId: 'opp' }, { playerId: 3 }])).toBe(false))
})

describe('matchInfoProblem', () => {
  const msg = 'Add the opposition and date in Match Info first.'
  it('flags a blank opposition', () =>
    expect(matchInfoProblem({ opposition: ' ', date: '2026-11-07' })).toBe(msg))
  it('flags a blank date', () =>
    expect(matchInfoProblem({ opposition: 'A', date: '' })).toBe(msg))
  it('flags a date not in YYYY-MM-DD', () =>
    expect(matchInfoProblem({ opposition: 'A', date: '07/11/2026' })).toBe(msg))
  it('passes good info', () =>
    expect(matchInfoProblem({ opposition: 'A', date: '2026-11-07' })).toBeNull())
})

describe('buildMatchPayload', () => {
  const players = [
    { id: 1, number: '1', name: 'Leo', engineRoomId: 'a', isOpposition: false },
    { id: 2, number: '11', name: 'Smith', isOpposition: false },
    { id: 'opp', number: '', name: 'Opposition', isOpposition: true },
  ]
  const ev = (playerId, statKey, meterage = null) => ({ playerId, statKey, meterage })
  const events = [
    ev(1, 'carry', 8),
    ev(1, 'carry', null),
    ev(1, 'tackle'),
    ev(1, 'kick_off'),
    ev('opp', 'carry', 30),
  ]

  it('builds the exact payload', () => {
    const p = buildMatchPayload('sess-1', info, players, events)
    expect(p.ref).toBe('sess-1')
    expect(p.opponent).toBe('Rivals')
    expect(p.playedOn).toBe('2026-11-07')
    expect(p.venue).toBeNull()
    expect(p.ourScore).toBe(24)
    expect(p.theirScore).toBe(10)
    expect(p.players).toHaveLength(2)
    const [leo, smith] = p.players
    expect(leo.engineRoomId).toBe('a')
    expect(leo.name).toBe('Leo')
    expect(leo.number).toBe(1)
    expect(leo.counts.carry).toBe(2)
    expect(leo.counts.tackle).toBe(1)
    expect(leo.counts.metres).toBe(8)
    expect(Object.keys(leo.counts).sort()).toEqual([...ENGINE_ROOM_KEYS, 'metres'].sort())
    expect(leo.counts).not.toHaveProperty('kick_off')
    expect(smith.engineRoomId).toBeNull()
    expect(smith.number).toBe(11)
    expect(Object.values(smith.counts).every((v) => v === 0)).toBe(true)
    expect(p.players.find((x) => x.name === 'Opposition')).toBeUndefined()
  })

  it('sends null for blank or non-numeric scores', () => {
    const p = buildMatchPayload('s', { ...info, ourScore: '', oppScore: 'abc' }, players, [])
    expect(p.ourScore).toBeNull()
    expect(p.theirScore).toBeNull()
  })

  it('sends null for a number that is not a whole number', () => {
    const p = buildMatchPayload('s', info, [{ id: 1, number: 'x', name: 'A', isOpposition: false }], [])
    expect(p.players[0].number).toBeNull()
  })

  it('ignores non-finite meterage and rounds the total', () => {
    const p = buildMatchPayload('s', info, [players[0]], [
      ev(1, 'carry', 2.4), ev(1, 'carry', 2.4), ev(1, 'carry', NaN), ev(1, 'carry', Infinity), ev(1, 'carry', undefined),
    ])
    expect(p.players[0].counts.metres).toBe(5)
    expect(p.players[0].counts.carry).toBe(5)
  })

  it('clamps counts to Engine Room limits (200, metres 2000)', () => {
    const many = Array.from({ length: 201 }, () => ev(1, 'tackle'))
    const far = [ev(1, 'carry', 1500), ev(1, 'carry', 1500)]
    const p = buildMatchPayload('s', info, [players[0]], [...many, ...far])
    expect(p.players[0].counts.tackle).toBe(200)
    expect(p.players[0].counts.metres).toBe(2000)
  })
})

describe('squadRowLabel', () => {
  it('adds (F) or (B) and a warning only for same-name players', () => {
    expect(squadRowLabel({ name: 'Sam Lee', position: 'forward', sameName: true }))
      .toEqual({ text: 'Sam Lee (F)', warning: SAME_NAME_WARNING })
    expect(squadRowLabel({ name: 'Sam Lee', position: 'back', sameName: true }))
      .toEqual({ text: 'Sam Lee (B)', warning: SAME_NAME_WARNING })
  })
  it('leaves unique names plain', () => {
    expect(squadRowLabel({ name: 'Al Ray', position: 'back', sameName: false }))
      .toEqual({ text: 'Al Ray', warning: null })
  })
  it('uses the agreed warning text', () => {
    expect(SAME_NAME_WARNING).toBe('Same name as another player: check the nickname in Engine Room')
  })
})

describe('templatePlayers', () => {
  it('keeps id, number, name and engineRoomId and drops opposition and extras', () => {
    const out = templatePlayers([
      { id: 1, number: 1, name: 'A', engineRoomId: 'u1', comments: 'x', coachScore: 5, isOpposition: false },
      { id: 'opp', number: 'OPP', name: 'Opposition', isOpposition: true },
      { id: 2, number: 2, name: 'B' },
    ])
    expect(out).toEqual([
      { id: 1, number: 1, name: 'A', engineRoomId: 'u1' },
      { id: 2, number: 2, name: 'B', engineRoomId: null },
    ])
  })
})

describe('newPlayer', () => {
  it('builds the full default shape with no engineRoomId', () => {
    expect(newPlayer(7, ' Jo ', 123)).toEqual({
      id: 123, number: 7, name: 'Jo', engineRoomId: null,
      comments: '', coachScore: null, parentEmail: '', isOpposition: false,
    })
  })
})

describe('REPLACE_SQUAD_MESSAGE', () => {
  it('is the Review Focus 1 message', () => {
    expect(REPLACE_SQUAD_MESSAGE).toBe('Get the squad before you start tagging. Your tags are linked to the current players.')
  })
})

import { sendCheck, sendSuccessMessage, UNSAVED_MESSAGE, SEND_CONFIRM_MESSAGE } from './engineRoom'

describe('sendCheck', () => {
  const info = { opposition: 'Hunslet', date: '2026-11-07' }
  it('refuses an unsaved session', () => {
    expect(sendCheck(null, info)).toEqual({ ok: false, message: UNSAVED_MESSAGE })
    expect(UNSAVED_MESSAGE).toBe('Save the session first (💾) so Engine Room can recognise it if you send it again.')
  })
  it('refuses match info with a problem', () => {
    expect(sendCheck('lx2abc', { opposition: '', date: '2026-11-07' })).toEqual({
      ok: false, message: 'Add the opposition and date in Match Info first.',
    })
  })
  it('checks the save before the match info', () => {
    expect(sendCheck(null, {}).message).toBe(UNSAVED_MESSAGE)
  })
  it('otherwise returns the confirm text', () => {
    expect(sendCheck('lx2abc', info)).toEqual({ ok: true, confirm: SEND_CONFIRM_MESSAGE })
    expect(SEND_CONFIRM_MESSAGE).toBe('Send to Engine Room? This replaces anything already sent for this match, including any changes a coach made there. A coach checks it and releases it to the players.')
  })
})

describe('sendSuccessMessage', () => {
  it('uses the message alone when every player is linked', () => {
    expect(sendSuccessMessage({ message: 'Sent.', unknown: 0 })).toBe('Sent.')
    expect(sendSuccessMessage({ message: 'Sent.' })).toBe('Sent.')
  })
  it('appends a singular count', () => {
    expect(sendSuccessMessage({ message: 'Sent.', unknown: 1 })).toBe('Sent. 1 player without an Engine Room link: a coach will match them up.')
  })
  it('appends a plural count', () => {
    expect(sendSuccessMessage({ message: 'Sent.', unknown: 3 })).toBe('Sent. 3 players without an Engine Room link: a coach will match them up.')
  })
})

import { renameUpdate, RENAME_LINKED_MESSAGE, untaggedLinkedPlayers } from './engineRoom'

describe('renameUpdate', () => {
  const linked = { id: 1, name: 'Sam (F)', engineRoomId: 'u1' }
  const unlinked = { id: 2, name: 'Player 2', engineRoomId: null }
  const never = () => { throw new Error('should not ask') }

  it('renames an unlinked player without asking', () => {
    expect(renameUpdate(unlinked, ' Jo ', never)).toEqual({ name: 'Jo' })
  })
  it('does nothing for a blank or unchanged name, and does not ask', () => {
    expect(renameUpdate(linked, '   ', never)).toBeNull()
    expect(renameUpdate(linked, ' Sam (F) ', never)).toBeNull()
  })
  it('asks the agreed question for a linked player and keeps the link on OK', () => {
    let asked = null
    const out = renameUpdate(linked, 'Sammy', (msg) => { asked = msg; return true })
    expect(asked).toBe(RENAME_LINKED_MESSAGE)
    expect(out).toEqual({ name: 'Sammy' })
  })
  it('unlinks him on Cancel', () => {
    expect(renameUpdate(linked, 'Sammy', () => false)).toEqual({ name: 'Sammy', engineRoomId: null })
  })
  it('uses the agreed question text', () => {
    expect(RENAME_LINKED_MESSAGE).toBe('Is this still the same player from Engine Room? Cancel unlinks him, and a coach will match him up in Engine Room.')
  })
})

describe('untaggedLinkedPlayers', () => {
  const players = [
    { id: 1, name: 'Leo', engineRoomId: 'a' },
    { id: 2, name: 'Sam', engineRoomId: 'b' },
    { id: 3, name: 'Joe', engineRoomId: null },
    { id: 4, name: 'Al', engineRoomId: 'd' },
    { id: 'opp', name: 'Opposition', isOpposition: true, engineRoomId: 'z' },
  ]
  it('lists linked home players with no events, in squad order', () => {
    const events = [{ playerId: 1, statKey: 'tackle' }, { playerId: 'opp', statKey: 'try' }]
    expect(untaggedLinkedPlayers(players, events)).toEqual(['Sam', 'Al'])
  })
  it('is empty when every linked player has a tag', () => {
    const events = [1, 2, 4].map((playerId) => ({ playerId, statKey: 'carry' }))
    expect(untaggedLinkedPlayers(players, events)).toEqual([])
  })
  it('copes with missing events', () => {
    expect(untaggedLinkedPlayers(players, undefined)).toEqual(['Leo', 'Sam', 'Al'])
  })
})

describe('sendCheck warnings', () => {
  const info = { opposition: 'Hunslet', date: '2026-11-07' }
  const players = [{ id: 1, name: 'Leo', engineRoomId: 'a' }, { id: 2, name: 'Sam', engineRoomId: 'b' }]
  const NO_TAGS = '\n\nThese players have no tags and will be sent as 0: Sam. If they didn\'t play, cancel: a coach can untick them in Engine Room.'
  const UNSAVED_NOTE = '\n\n(This includes changes you haven\'t saved yet.)'

  it('appends the no-tags list', () => {
    const res = sendCheck('lx2abc', info, { players, events: [{ playerId: 1 }], isDirty: false })
    expect(res).toEqual({ ok: true, confirm: SEND_CONFIRM_MESSAGE + NO_TAGS })
  })
  it('joins several names with commas', () => {
    const res = sendCheck('lx2abc', info, { players, events: [], isDirty: false })
    expect(res.confirm).toContain('will be sent as 0: Leo, Sam.')
  })
  it('appends the unsaved-changes note when dirty', () => {
    const res = sendCheck('lx2abc', info, { players, events: [{ playerId: 1 }, { playerId: 2 }], isDirty: true })
    expect(res.confirm).toBe(SEND_CONFIRM_MESSAGE + UNSAVED_NOTE)
  })
  it('puts the no-tags list before the unsaved note', () => {
    const res = sendCheck('lx2abc', info, { players, events: [{ playerId: 1 }], isDirty: true })
    expect(res.confirm).toBe(SEND_CONFIRM_MESSAGE + NO_TAGS + UNSAVED_NOTE)
  })
})

describe('engineRoomEnabled', async () => {
  const { engineRoomEnabled } = await import('./engineRoom.js')
  it('is off until an Engine Room address is saved', () => {
    expect(engineRoomEnabled(null)).toBe(false)
    expect(engineRoomEnabled(undefined)).toBe(false)
    expect(engineRoomEnabled({})).toBe(false)
    expect(engineRoomEnabled({ url: '', code: 'abc' })).toBe(false)
    expect(engineRoomEnabled({ url: '   ', code: 'abc' })).toBe(false)
  })
  it('is on once an address is saved, code or not', () => {
    expect(engineRoomEnabled({ url: 'https://er.example', code: '' })).toBe(true)
    expect(engineRoomEnabled({ url: 'https://er.example', code: 'abc' })).toBe(true)
  })
})
