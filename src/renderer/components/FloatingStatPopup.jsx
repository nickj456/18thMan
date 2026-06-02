import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ALL_STATS } from './StatButtons'

const POPUP_W = 300
const POPUP_H = 480

export default function FloatingStatPopup({ player, anchor, addEvent, onClose }) {
  const ref = useRef(null)
  const [flashing, setFlashing] = useState(null)

  const left = Math.min(anchor.x, window.innerWidth  - POPUP_W - 8)
  const top  = Math.min(anchor.y, window.innerHeight - POPUP_H - 8)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 120)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler) }
  }, [onClose])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleStat = useCallback((stat) => {
    addEvent(stat.key, stat.label, stat.color)
    setFlashing(stat.key)
    setTimeout(() => setFlashing(null), 220)
  }, [addEvent])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', left, top,
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
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 13, color: 'var(--brand)' }}>
            #{player.number}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text)', marginLeft: 6 }}>
            {player.name}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
        >
          ✕
        </button>
      </div>

      {/* Stat grid — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, padding: 8 }}>
        {ALL_STATS.map((stat) => (
          <button
            key={stat.key}
            onClick={() => handleStat(stat)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 8px', borderRadius: 2, cursor: 'pointer',
              background: flashing === stat.key ? stat.color : `${stat.color}14`,
              border: `1px solid ${stat.color}44`,
              color: flashing === stat.key ? '#fff' : stat.color,
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
              letterSpacing: 0.3, textTransform: 'uppercase',
              transition: 'background 0.08s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${stat.color}28` }}
            onMouseLeave={(e) => { e.currentTarget.style.background = flashing === stat.key ? stat.color : `${stat.color}14` }}
          >
            <span>{stat.label}</span>
            <span style={{ fontSize: 9, opacity: 0.5, background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 2 }}>
              {stat.shortcut}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: '4px 10px 7px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)', textAlign: 'center' }}>
        Esc to close · keyboard shortcuts active
      </div>
    </div>
  )
}
