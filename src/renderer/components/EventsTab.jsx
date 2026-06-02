import React, { useState, useMemo } from 'react'
import { fmtTime as fmt } from '../utils/format'
import { ALL_STATS } from './StatButtons'

export default function EventsTab({ events, deleteEvent, seekTo, videoDuration, addClip, showNotification, onUndo, canUndo }) {
  const [autoClipOpen, setAutoClipOpen] = useState(false)
  const [bufferBefore, setBufferBefore] = useState(5)
  const [bufferAfter, setBufferAfter]   = useState(8)
  const [filterPlayer, setFilterPlayer] = useState('all')
  const [filterStat, setFilterStat]     = useState('all')

  const playerOptions = useMemo(() => {
    const seen = new Map()
    events.forEach(ev => { if (ev.playerId != null && !seen.has(ev.playerId)) seen.set(ev.playerId, ev.playerName) })
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [events])

  const usedStatKeys = useMemo(() => new Set(events.map(ev => ev.statKey)), [events])
  const statOptions = ALL_STATS.filter(s => usedStatKeys.has(s.key))

  const filteredEvents = useMemo(() => events.filter(ev => {
    if (filterPlayer !== 'all' && String(ev.playerId) !== filterPlayer) return false
    if (filterStat   !== 'all' && ev.statKey   !== filterStat)   return false
    return true
  }), [events, filterPlayer, filterStat])

  const handleAutoClip = () => {
    if (!filteredEvents.length) { showNotification?.('No events to clip', 'error'); return }
    let count = 0
    filteredEvents.forEach(ev => {
      const inPoint  = Math.max(0, ev.timestamp - bufferBefore)
      const outPoint = videoDuration ? Math.min(videoDuration, ev.timestamp + bufferAfter) : ev.timestamp + bufferAfter
      if (outPoint > inPoint) {
        addClip?.({ inPoint, outPoint, label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`, playerName: ev.playerName })
        count++
      }
    })
    setAutoClipOpen(false)
    showNotification?.(`${count} clips created — go to Clips tab to export`)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filter bar */}
      <div style={{ padding: '5px 8px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>FILTER</span>
        <select
          value={filterPlayer}
          onChange={e => setFilterPlayer(e.target.value)}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 4px', cursor: 'pointer' }}
        >
          <option value="all">All Players</option>
          {playerOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          value={filterStat}
          onChange={e => setFilterStat(e.target.value)}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 4px', cursor: 'pointer' }}
        >
          <option value="all">All Event Types</option>
          {statOptions.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {(filterPlayer !== 'all' || filterStat !== 'all') && (
          <button
            onClick={() => { setFilterPlayer('all'); setFilterStat('all') }}
            style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, padding: '2px 8px', cursor: 'pointer', color: 'var(--muted)' }}
          >
            CLEAR
          </button>
        )}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filteredEvents.length} / {events.length}
        </span>
      </div>
      {/* Auto-clip toolbar */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => setAutoClipOpen(o => !o)}
          style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, background: autoClipOpen ? 'rgba(232,86,10,0.12)' : 'transparent', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 10px', cursor: 'pointer', color: autoClipOpen ? 'var(--brand)' : 'var(--muted)', letterSpacing: 0.5 }}
          title="Auto-create a clip around every logged event"
        >
          ✂️ {(filterPlayer !== 'all' || filterStat !== 'all') ? 'AUTO-CLIP FILTERED' : 'AUTO-CLIP ALL EVENTS'}
        </button>
        {canUndo && (
          <button
            onClick={onUndo}
            title="Undo last deletion"
            style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 10px', cursor: 'pointer', color: 'var(--amber)', letterSpacing: 0.5 }}
          >
            ↩ UNDO
          </button>
        )}
        {autoClipOpen && (
          <>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Before:</span>
            <input type="number" value={bufferBefore} min={1} max={30} onChange={e => setBufferBefore(Math.min(30, Math.max(1, Number(e.target.value))))} style={{ width: 44, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>s &nbsp; After:</span>
            <input type="number" value={bufferAfter} min={1} max={30} onChange={e => setBufferAfter(Math.min(30, Math.max(1, Number(e.target.value))))} style={{ width: 44, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>s</span>
            <button onClick={handleAutoClip} style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 2, padding: '3px 10px', cursor: 'pointer' }}>
              CREATE {filteredEvents.length} CLIPS
            </button>
          </>
        )}
      </div>
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {filteredEvents.length === 0 ? (
        <Empty>
          {events.length === 0
            ? 'No events yet. Select a player, then click a stat button or press a shortcut key.'
            : 'No events match the current filter.'}
        </Empty>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
              {['TIME', 'H', 'PLAYER', 'STAT', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left', padding: '5px 8px',
                  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
                  color: 'var(--muted)', letterSpacing: 1.2, textTransform: 'uppercase',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((ev) => (
              <tr
                key={ev.id}
                style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.08s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => seekTo(ev.timestamp)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--brand)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12,
                      textDecoration: 'underline', padding: 0,
                    }}
                  >
                    {fmt(ev.timestamp)}
                  </button>
                </td>
                <td style={{ padding: '4px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                  {ev.half}
                </td>
                <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', fontSize: 12 }}>
                    #{ev.playerNumber}
                  </span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, marginLeft: 4 }}>
                    {ev.playerName}
                  </span>
                </td>
                <td style={{ padding: '4px 8px' }}>
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
                    letterSpacing: 0.5, textTransform: 'uppercase',
                    color: ev.color,
                    border: `1px solid ${ev.color}50`, padding: '2px 7px', borderRadius: 2,
                    background: `${ev.color}14`,
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.statLabel}
                  </span>
                </td>
                <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => seekTo(Math.max(0, ev.timestamp - 3))}
                    title="Jump to 3s before event"
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--muted)', cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
                      borderRadius: 2, padding: '1px 5px', marginRight: 4,
                    }}
                  >
                    −3s
                  </button>
                  <button
                    onClick={() => deleteEvent(ev.id)}
                    title="Delete event"
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--muted)', cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </div>
  )
}

function Empty({ children }) {
  return (
    <div style={{
      color: 'var(--muted)', fontFamily: 'var(--font-body)',
      fontSize: 12, textAlign: 'center', padding: '40px 24px', lineHeight: 1.8,
    }}>
      {children}
    </div>
  )
}
