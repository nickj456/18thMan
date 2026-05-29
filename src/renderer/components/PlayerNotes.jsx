import React, { useState } from 'react'
import { consensusScore } from '../utils/scoring'

export default function PlayerNotes({ player, updatePlayer, onEmailParent }) {
  const [expanded, setExpanded] = useState(true)

  if (!player) return null

  const score = player.coachScore
  const cs    = consensusScore(player)

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)',
      flexShrink: 0,
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px', background: 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <span style={{
          fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
          letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase',
        }}>
          Player Notes
        </span>
        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', fontSize: 12 }}>
          #{player.number} {player.name}
        </span>
        {score !== null && score !== undefined && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--font-ui)', fontSize: 10,
            fontWeight: 800, color: 'var(--brand)',
          }}>
            {score}/10
          </span>
        )}
        <span style={{ color: 'var(--muted)', fontSize: 10, marginLeft: score ? 0 : 'auto' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Coach score */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
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
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                <button
                  key={n}
                  onClick={() => updatePlayer(player.id, { coachScore: score === n ? null : n })}
                  style={{
                    width: 22, height: 22, borderRadius: 2, border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
                    background: score >= n ? 'var(--brand)' : 'var(--panel)',
                    color: score >= n ? '#fff' : 'var(--muted-2)',
                    transition: 'all 0.1s',
                  }}
                >
                  {n}
                </button>
              ))}
              {score !== null && score !== undefined && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--brand)', marginLeft: 4 }}>
                  {score}/10
                </span>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4,
            }}>
              Coach Comments
            </div>
            <textarea
              value={player.comments || ''}
              onChange={(e) => updatePlayer(player.id, { comments: e.target.value })}
              placeholder="Add coaching notes for this player..."
              rows={3}
              style={{
                width: '100%', resize: 'vertical', minHeight: 56, maxHeight: 120,
                fontFamily: 'var(--font-body)', fontSize: 11,
                padding: '6px 8px', borderRadius: 2,
              }}
            />
          </div>

          {/* Parent email */}
          <div>
            <div style={{
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4,
            }}>
              Parent / Guardian Email
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              <input
                type="email"
                value={player.parentEmail || ''}
                onChange={(e) => updatePlayer(player.id, { parentEmail: e.target.value })}
                placeholder="parent@example.com"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              />
              <button
                onClick={() => onEmailParent(player)}
                disabled={!player.parentEmail}
                title="Send positive performance email to parent"
                style={{
                  background: player.parentEmail ? 'var(--brand)' : 'transparent',
                  color: player.parentEmail ? '#fff' : 'var(--muted-2)',
                  border: `1px solid ${player.parentEmail ? 'var(--brand)' : 'var(--border)'}`,
                  padding: '3px 10px', borderRadius: 2,
                  fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
                  letterSpacing: 0.5, cursor: player.parentEmail ? 'pointer' : 'not-allowed',
                  opacity: player.parentEmail ? 1 : 0.4,
                }}
              >
                📧 EMAIL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
