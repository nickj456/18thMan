import React, { useRef, useEffect, useState, useCallback } from 'react'

const STATS = [
  { key: 'try',          label: 'Try',          shortcut: 'T', color: 'var(--green)' },
  { key: 'tackle',       label: 'Tackle',        shortcut: 'A', color: 'var(--blue)' },
  { key: 'missed_tackle',label: 'Miss',          shortcut: 'M', color: 'var(--red)' },
  { key: 'carry',        label: 'Carry',         shortcut: 'C', color: 'var(--amber)' },
  { key: 'line_break',   label: 'Line Brk',      shortcut: 'L', color: 'var(--purple)' },
  { key: 'support',      label: 'Support',       shortcut: 'S', color: 'var(--teal)' },
  { key: 'offload',      label: 'Offload',       shortcut: 'O', color: 'var(--teal)' },
  { key: 'kick',         label: 'Kick',          shortcut: 'K', color: 'var(--dark-red)' },
  { key: 'penalty_won',  label: 'Pen Won',       shortcut: 'P', color: 'var(--green)' },
  { key: 'penalty_con',  label: 'Pen Con',       shortcut: 'N', color: 'var(--orange)' },
  { key: 'error',        label: 'Error',         shortcut: 'E', color: 'var(--red)' },
  { key: 'intercept',    label: 'Intercept',     shortcut: 'I', color: 'var(--purple)' },
]

const POPUP_W = 260
const POPUP_H = 320

export default function FloatingStatPopup({ player, anchor, addEvent, onClose }) {
  const ref = useRef(null)
  const [flashing, setFlashing] = useState(null)
  const [flash, setFlash] = useState(false)

  // Clamp position to stay within viewport
  const left = Math.min(anchor.x, window.innerWidth  - POPUP_W - 8)
  const top  = Math.min(anchor.y, window.innerHeight - POPUP_H - 8)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    // Slight delay so the same click that opened the popup doesn't close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 120)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleStat = useCallback((stat) => {
    addEvent(stat.key, stat.label, stat.color)
    setFlashing(stat.key)
    setFlash(true)
    setTimeout(() => { setFlashing(null); setFlash(false) }, 220)
  }, [addEvent])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left, top,
        width: POPUP_W,
        background: 'var(--panel)',
        border: '1px solid var(--brand)',
        borderRadius: 4,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        zIndex: 8500,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 10px 6px',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <span style={{
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
            fontSize: 13, color: 'var(--brand)',
          }}>
            #{player.number}
          </span>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)',
            marginLeft: 6,
          }}>
            {player.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: 'var(--muted)',
            cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Stat grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 4, padding: 8,
      }}>
        {STATS.map((stat) => (
          <button
            key={stat.key}
            onClick={() => handleStat(stat)}
            className={flashing === stat.key ? 'btn-flash' : ''}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 2, cursor: 'pointer',
              background: `${stat.color}14`,
              border: `1px solid ${stat.color}44`,
              color: stat.color,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              letterSpacing: 0.3, textTransform: 'uppercase',
              transition: 'background 0.08s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${stat.color}28` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${stat.color}14` }}
          >
            <span>{stat.label}</span>
            <span style={{
              fontSize: 9, opacity: 0.5,
              background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 2,
            }}>
              {stat.shortcut}
            </span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <div style={{
        padding: '4px 10px 7px',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
        textAlign: 'center',
      }}>
        Esc to close · keyboard shortcuts active
      </div>
    </div>
  )
}
