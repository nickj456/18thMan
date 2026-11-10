import React, { useState, useEffect, useCallback, useRef } from 'react'
import { squadToPlayers, canReplaceSquad, squadRowLabel, templatePlayers, newPlayer, renameUpdate, REPLACE_SQUAD_MESSAGE } from '../utils/engineRoom'

const KEY_MAP = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '0': 10, '-': 11, '=': 12, 'Backspace': 13,
}

// replaceSquad swaps the whole squad (and clears Undo in App); setPlayers is for edits within the squad.
export default function PlayerSelector({ players, setPlayers, replaceSquad, updatePlayer, selectedPlayer, setSelectedPlayer, onPlayerCardClick, onNotesClick, events }) {
  const [editing, setEditing]         = useState(null)
  const [editName, setEditName]       = useState('')
  const editingRef                    = useRef(null) // guards against Enter and blur both committing
  const [newNum, setNewNum]           = useState('')
  const [newName, setNewName]         = useState('')
  const [templates, setTemplates]     = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSquad, setShowSquad]     = useState(false)
  const [squad, setSquad]             = useState([])
  const [pickedIds, setPickedIds]     = useState([])
  const [squadMsg, setSquadMsg]       = useState(null)
  const [squadLoading, setSquadLoading] = useState(false)
  const [tmplMsg, setTmplMsg]         = useState(null)

  const openSquadPicker = async () => {
    setShowTemplates(false)
    setShowSquad(true)
    setSquadMsg(null)
    setPickedIds([])
    setSquadLoading(true)
    const r = await window.electron?.getEngineRoomSquad()
    setSquadLoading(false)
    if (r?.success) setSquad(r.players)
    else { setSquad([]); setSquadMsg(r?.error || "Couldn't reach Engine Room. Check the address and your internet.") }
  }

  const togglePicked = (id) => setPickedIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

  const confirmSquad = () => {
    if (!canReplaceSquad(events)) { setSquadMsg(REPLACE_SQUAD_MESSAGE); return }
    replaceSquad(squadToPlayers(squad, pickedIds))
    setSelectedPlayer(null)
    setShowSquad(false)
  }

  const loadTemplates = async () => {
    const t = await window.electron?.listSquads() || []
    setTemplates(t)
  }

  const saveAsTemplate = async () => {
    const name = `${players.filter(p => !p.isOpposition).length} players`
    const id = Date.now().toString(36)
    const tmplName = players.find(p => p.number === 1)?.name !== 'Player 1'
      ? `Squad (${new Date().toLocaleDateString('en-GB')})`
      : `Squad template`
    await window.electron?.saveSquad({ id, name: tmplName, players: templatePlayers(players) })
    alert(`Squad saved as template: "${tmplName}"`)
  }

  const applyTemplate = (template) => {
    if (!canReplaceSquad(events)) { setTmplMsg(REPLACE_SQUAD_MESSAGE); return }
    const newPlayers = template.players.map(p => ({
      ...p, comments: '', coachScore: null, parentEmail: '', isOpposition: false
    }))
    replaceSquad(newPlayers)
    setSelectedPlayer(null)
    setShowTemplates(false)
  }

  const select = useCallback((player) => {
    setSelectedPlayer((prev) => prev?.id === player.id ? null : player)
  }, [setSelectedPlayer])

  useEffect(() => {
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const num = KEY_MAP[e.key]
      if (!num) return
      const player = players.find((p) => p.number === num)
      if (player) { e.preventDefault(); select(player) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [players, select])

  const startRename = (player) => { editingRef.current = player.id; setEditing(player.id); setEditName(player.name) }
  const cancelRename = () => { editingRef.current = null; setEditing(null) }
  const commitRename = (player) => {
    if (editingRef.current !== player.id) return
    editingRef.current = null
    const updates = renameUpdate(player, editName, (msg) => window.confirm(msg))
    if (updates) {
      // Route through updatePlayer so existing events get the new name too
      if (updatePlayer) updatePlayer(player.id, updates)
      else setPlayers((p) => p.map((pl) => pl.id === player.id ? { ...pl, ...updates } : pl))
    }
    setEditing(null)
  }
  const addPlayer = () => {
    const num = parseInt(newNum)
    if (!num || !newName.trim() || players.find((p) => p.number === num)) return
    setPlayers((p) => [...p, newPlayer(num, newName, Date.now())].sort((a, b) => a.number - b.number))
    setNewNum(''); setNewName('')
  }

  return (
    <div style={{
      flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'var(--panel)',
    }}>
      {/* Player grid */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: 6,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 3,
      }}>
        {players.map((player) => {
          const active = selectedPlayer?.id === player.id
          return (
            <div
              key={player.id}
              onClick={(e) => {
                select(player)
                const rect = e.currentTarget.getBoundingClientRect()
                onPlayerCardClick?.(selectedPlayer?.id === player.id ? null : player, rect)
              }}
              onDoubleClick={() => startRename(player)}
              style={{
                padding: '5px 4px', borderRadius: 2, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                background: active ? 'rgba(232,86,10,0.12)' : 'var(--bg)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                transition: 'all 0.1s',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
                fontSize: 15, color: active ? 'var(--brand)' : 'var(--text)', lineHeight: 1,
              }}>
                #{player.number}
              </span>
              {editing === player.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitRename(player)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(player); if (e.key === 'Escape') cancelRename() }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%', textAlign: 'center', fontSize: 10, padding: '1px 2px' }}
                />
              ) : (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 10,
                  color: active ? 'var(--text)' : 'var(--muted)',
                  textAlign: 'center', wordBreak: 'break-word', lineHeight: 1.2,
                }}>
                  {player.name}
                </span>
              )}
              {player.engineRoomId && (
                <span title="Linked to Engine Room" style={{
                  fontFamily: 'var(--font-ui)', fontSize: 7, fontWeight: 800, letterSpacing: 0.5,
                  color: 'var(--muted-2)', border: '1px solid var(--border)', borderRadius: 2,
                  padding: '0 3px', lineHeight: '10px',
                }}>ER</span>
              )}
              {/* Notes icon — only show for non-opposition players */}
              {!player.isOpposition && onNotesClick && (
                <button
                  onClick={(e) => { e.stopPropagation(); onNotesClick(player) }}
                  title="Player notes & score"
                  style={{
                    background: (player.coachScore != null || player.comments) ? 'rgba(232,86,10,0.2)' : 'transparent',
                    border: 'none', borderRadius: 2, padding: '1px 4px',
                    cursor: 'pointer', fontSize: 9, color: 'var(--muted-2)',
                    marginTop: 1, lineHeight: 1,
                  }}
                >
                  {player.coachScore != null ? `★ ${player.coachScore}` : '✎'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add player + hint */}
      <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
      {/* Template picker */}
      {showTemplates && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 3,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Load Squad Template
          </div>
          {tmplMsg && <div style={{ padding: '8px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--red)' }}>{tmplMsg}</div>}
          {templates.length === 0 ? (
            <div style={{ padding: '10px 8px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)' }}>
              No templates saved yet. Rename your players then click "Save Template".
            </div>
          ) : templates.map(t => (
            <div
              key={t.id}
              onClick={() => applyTemplate(t)}
              style={{
                padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {t.name}
              <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: 8 }}>{t.playerCount} players</span>
            </div>
          ))}
          <div style={{ padding: '6px 8px', display: 'flex', gap: 4 }}>
            <button onClick={() => setShowTemplates(false)} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 8px', cursor: 'pointer', color: 'var(--muted)' }}>CANCEL</button>
          </div>
        </div>
      )}

      {/* Engine Room squad picker */}
      {showSquad && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, zIndex: 200,
          background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 3,
          maxHeight: 260, overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Who is playing today?
          </div>
          {squadLoading && <div style={{ padding: '10px 8px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)' }}>Loading…</div>}
          {squadMsg && <div style={{ padding: '8px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--red)' }}>{squadMsg}</div>}
          {squad.map((s) => {
            const label = squadRowLabel(s)
            return (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text)' }}>
                <input type="checkbox" checked={pickedIds.includes(s.id)} onChange={() => togglePicked(s.id)} />
                <span>{label.text}</span>
                {label.warning && <span title={label.warning} style={{ color: 'var(--brand)' }}>⚠</span>}
              </label>
            )
          })}
          <div style={{ padding: '6px 8px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setShowSquad(false)} style={tmplBtn}>CANCEL</button>
            <button onClick={confirmSquad} disabled={pickedIds.length === 0} style={{ ...tmplBtn, color: pickedIds.length ? 'var(--brand)' : 'var(--muted)' }}>
              {pickedIds.length} picked · Use this squad
            </button>
          </div>
        </div>
      )}

        <div style={{ display: 'flex', gap: 4, padding: '5px 6px' }}>
          <input
            value={newNum} onChange={(e) => setNewNum(e.target.value)}
            placeholder="#" style={{ width: 38 }} type="number" min="1" max="99"
          />
          <input
            value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name..." style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') addPlayer() }}
          />
          <button onClick={addPlayer} style={{
            background: 'var(--brand)', color: '#fff', border: 'none',
            padding: '3px 10px', borderRadius: 2, fontSize: 11, fontWeight: 800,
            fontFamily: 'var(--font-ui)', letterSpacing: 0.5, cursor: 'pointer',
          }}>ADD</button>
        </div>
        <div style={{
          padding: '2px 8px 5px',
          fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
        }}>
          1–9 · 0=10 · -=11 · ==12 · Bksp=13
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '3px 6px 5px', borderTop: '1px solid var(--border)' }}>
          <button onClick={saveAsTemplate} style={tmplBtn} title="Save squad as reusable template">SAVE TEMPLATE</button>
          <button onClick={() => { loadTemplates(); setTmplMsg(null); setShowSquad(false); setShowTemplates(s => !s) }} style={tmplBtn}>LOAD TEMPLATE</button>
          <button onClick={openSquadPicker} style={tmplBtn} title="Pick today's players from Engine Room">FROM ENGINE ROOM</button>
        </div>
      </div>
    </div>
  )
}

const tmplBtn = {
  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
  background: 'transparent', border: '1px solid var(--border)',
  borderRadius: 2, padding: '2px 7px', cursor: 'pointer', color: 'var(--muted)',
}
