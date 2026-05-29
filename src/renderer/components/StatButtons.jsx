import React, { useState, useCallback } from 'react'

const STATS = [
  { key: 'try',          label: 'Try',           shortcut: 'T', color: 'var(--green)' },
  { key: 'tackle',       label: 'Tackle',         shortcut: 'A', color: 'var(--blue)' },
  { key: 'missed_tackle',label: 'Missed tackle',  shortcut: 'M', color: 'var(--red)' },
  { key: 'carry',        label: 'Carry',          shortcut: 'C', color: 'var(--amber)' },
  { key: 'line_break',   label: 'Line break',     shortcut: 'L', color: 'var(--purple)' },
  { key: 'support',      label: 'Support',        shortcut: 'S', color: 'var(--teal)' },
  { key: 'offload',      label: 'Offload',        shortcut: 'O', color: 'var(--teal)' },
  { key: 'kick',         label: 'Kick',           shortcut: 'K', color: 'var(--dark-red)' },
  { key: 'penalty_won',  label: 'Penalty won',    shortcut: 'P', color: 'var(--green)' },
  { key: 'penalty_con',  label: 'Penalty con',    shortcut: 'N', color: 'var(--orange)' },
  { key: 'error',        label: 'Error',          shortcut: 'E', color: 'var(--red)' },
  { key: 'intercept',    label: 'Intercept',      shortcut: 'I', color: 'var(--purple)' },
]

export default function StatButtons({ selectedPlayer, addEvent }) {
  const [flashing, setFlashing] = useState(null)
  const [warn, setWarn] = useState(false)

  const handleClick = useCallback((stat) => {
    if (!selectedPlayer) {
      setWarn(true)
      setTimeout(() => setWarn(false), 2000)
      return
    }
    addEvent(stat.key, stat.label, stat.color)
    setFlashing(stat.key)
    setTimeout(() => setFlashing(null), 220)
  }, [selectedPlayer, addEvent])

  return (
    <div style={{
      padding: '8px 8px 6px', borderBottom: '1px solid var(--border)',
      background: 'var(--panel)', flexShrink: 0,
    }}>
      {/* Active player strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 7, padding: '4px 6px',
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 2,
      }}>
        <span style={{
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
          letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase',
        }}>
          Active Player
        </span>
        {selectedPlayer ? (
          <span style={{
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
            fontSize: 13, color: 'var(--brand)', letterSpacing: 0.3,
          }}>
            #{selectedPlayer.number} {selectedPlayer.name}
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--muted-2)' }}>
            None selected — use 1–9 keys or click grid
          </span>
        )}
      </div>

      {warn && (
        <div className="fadein" style={{
          fontFamily: 'var(--font-ui)', color: 'var(--brand)', fontSize: 11,
          fontWeight: 700, letterSpacing: 0.4,
          marginBottom: 6, padding: '4px 8px',
          border: '1px solid var(--brand)', borderRadius: 2,
          background: 'var(--brand-glow)',
        }}>
          ⚠ Select a player first
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {STATS.map((stat) => (
          <button
            key={stat.key}
            onClick={() => handleClick(stat)}
            className={flashing === stat.key ? 'btn-flash' : ''}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 9px', borderRadius: 2, cursor: 'pointer',
              background: `${stat.color}14`,
              border: `1px solid ${stat.color}44`,
              color: stat.color,
              fontFamily: 'var(--font-ui)',
              fontSize: 12, fontWeight: 700,
              letterSpacing: 0.4, textTransform: 'uppercase',
              transition: 'background 0.08s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${stat.color}28` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${stat.color}14` }}
          >
            <span>{stat.label}</span>
            <span style={{
              fontSize: 9, opacity: 0.55,
              background: 'rgba(0,0,0,0.35)', padding: '1px 5px', borderRadius: 2,
              fontWeight: 800, letterSpacing: 0.5,
            }}>
              {stat.shortcut}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
