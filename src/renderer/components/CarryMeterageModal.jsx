import React, { useState, useRef, useEffect } from 'react'

export default function CarryMeterageModal({ playerName, onConfirm, onSkip, onCancel }) {
  const [meters, setMeters] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    // Short delay so the stat button's keydown doesn't interfere
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  const handleConfirm = () => {
    const val = meters.trim()
    onConfirm(val ? Math.max(0, parseInt(val, 10)) : null)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onSkip()
  }

  return (
    <>
      {/* Dim overlay */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(7,8,13,0.7)',
          zIndex: 9998,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--panel)',
        border: '1px solid var(--brand)',
        borderRadius: 4, padding: '22px 26px',
        zIndex: 9999, minWidth: 280,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
            fontSize: 13, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            CARRY
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)' }}>
            {playerName}
          </span>
        </div>

        {/* Metres input */}
        <div style={{ marginBottom: 4 }}>
          <div style={{
            fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
            letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6,
          }}>
            Carry distance (metres)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              ref={inputRef}
              type="number"
              min="0"
              max="100"
              value={meters}
              onChange={(e) => setMeters(e.target.value)}
              onKeyDown={handleKey}
              placeholder="e.g. 12"
              style={{
                flex: 1, fontSize: 22, textAlign: 'center', padding: '8px 10px',
                fontFamily: 'var(--font-mono)', letterSpacing: 1,
              }}
            />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>m</span>
          </div>
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)', marginBottom: 16 }}>
          Enter to confirm · Esc to skip
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 2, background: 'var(--brand)', color: '#fff', border: 'none',
              padding: '8px 0', borderRadius: 2,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            {meters ? `LOG ${meters}m` : 'LOG CARRY'}
          </button>
          <button
            onClick={onSkip}
            style={{
              flex: 1, background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', padding: '8px 0', borderRadius: 2,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Skip
          </button>
          <button
            onClick={onCancel}
            style={{
              background: 'transparent', color: 'var(--muted-2)',
              border: 'none', padding: '8px 10px', cursor: 'pointer', fontSize: 14,
            }}
            title="Cancel"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  )
}
