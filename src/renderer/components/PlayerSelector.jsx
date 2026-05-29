import React, { useState, useEffect, useCallback } from 'react'

const KEY_MAP = {
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '0': 10, '-': 11, '=': 12, 'Backspace': 13,
}

export default function PlayerSelector({ players, setPlayers, updatePlayer, selectedPlayer, setSelectedPlayer, onPlayerCardClick }) {
  const [editing, setEditing]         = useState(null)
  const [editName, setEditName]       = useState('')
  const [newNum, setNewNum]           = useState('')
  const [newName, setNewName]         = useState('')
  const [templates, setTemplates]     = useState([])
  const [showTemplates, setShowTemplates] = useState(false)

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
    await window.electron?.saveSquad({ id, name: tmplName, players: players.filter(p => !p.isOpposition).map(({ id, number, name }) => ({ id, number, name })) })
    alert(`Squad saved as template: "${tmplName}"`)
  }

  const applyTemplate = (template) => {
    const newPlayers = template.players.map(p => ({
      ...p, comments: '', coachScore: null, parentEmail: '', isOpposition: false
    }))
    setPlayers(newPlayers)
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

  const startRename = (player) => { setEditing(player.id); setEditName(player.name) }
  const commitRename = (id) => {
    const trimmed = editName.trim()
    if (trimmed) {
      // Route through updatePlayer so existing events get the new name too
      if (updatePlayer) updatePlayer(id, { name: trimmed })
      else setPlayers((p) => p.map((pl) => pl.id === id ? { ...pl, name: trimmed } : pl))
    }
    setEditing(null)
  }
  const addPlayer = () => {
    const num = parseInt(newNum)
    if (!num || !newName.trim() || players.find((p) => p.number === num)) return
    setPlayers((p) => [...p, { id: Date.now(), number: num, name: newName.trim() }].sort((a, b) => a.number - b.number))
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
                  onBlur={() => commitRename(player.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitRename(player.id); if (e.key === 'Escape') setEditing(null) }}
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
            </div>
          )
        })}
      </div>

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

      {/* Add player + hint */}
      <div style={{ borderTop: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
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
          <button onClick={() => { loadTemplates(); setShowTemplates(s => !s) }} style={tmplBtn}>LOAD TEMPLATE</button>
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
