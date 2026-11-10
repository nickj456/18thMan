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
