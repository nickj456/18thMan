import React, { useEffect, useRef } from 'react'
import { consensusScore } from '../utils/scoring'

export default function PlayerNotesModal({ player, updatePlayer, onEmailParent, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!player) return null

  const score = player.coachScore
  const cs    = consensusScore(player)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(7,8,13,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        style={{
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 5, width: 420,
          boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 15, color: 'var(--brand)' }}>
              #{player.number}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text)', marginLeft: 8 }}>
              {player.name}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Coach score */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Your Score
              </span>
              {cs?.hasPeers && (
                <span
                  title={`Your score + ${cs.count - (cs.hasPersonal ? 1 : 0)} peer score(s) averaged`}
                  style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: 'var(--amber)', cursor: 'help' }}
                >
                  Consensus {cs.value}/10 ({cs.count})
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => updatePlayer(player.id, { coachScore: score === n ? null : n })}
                  style={{
                    width: 30, height: 30, borderRadius: 3, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800,
                    background: score >= n ? 'var(--brand)' : 'var(--bg)',
                    color: score >= n ? '#fff' : 'var(--muted-2)',
                    transition: 'all 0.1s',
                  }}
                >
                  {n}
                </button>
              ))}
              {score != null && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--brand)', marginLeft: 6, fontWeight: 800 }}>
                  {score}/10
                </span>
              )}
            </div>
          </div>

          {/* Coach comments */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Coach Comments
            </div>
            <textarea
              value={player.comments || ''}
              onChange={(e) => updatePlayer(player.id, { comments: e.target.value })}
              placeholder="Add coaching notes for this player…"
              rows={4}
              style={{
                width: '100%', resize: 'vertical', minHeight: 80,
                fontFamily: 'var(--font-body)', fontSize: 12,
                padding: '8px 10px', borderRadius: 3, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Parent email */}
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Parent / Guardian Email
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                value={player.parentEmail || ''}
                onChange={(e) => updatePlayer(player.id, { parentEmail: e.target.value })}
                placeholder="parent@example.com"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, padding: '6px 10px', borderRadius: 3 }}
              />
              <button
                onClick={() => { onEmailParent(player); onClose() }}
                disabled={!player.parentEmail}
                style={{
                  background: player.parentEmail ? 'var(--brand)' : 'transparent',
                  color: player.parentEmail ? '#fff' : 'var(--muted-2)',
                  border: `1px solid ${player.parentEmail ? 'var(--brand)' : 'var(--border)'}`,
                  padding: '6px 14px', borderRadius: 3,
                  fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
                  cursor: player.parentEmail ? 'pointer' : 'not-allowed',
                  opacity: player.parentEmail ? 1 : 0.4, whiteSpace: 'nowrap',
                }}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', padding: '6px 18px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
