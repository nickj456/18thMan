import React, { useMemo } from 'react'
import { STAT_CLASSIFICATION, STAT_COLORS } from '../utils/stats'
import { consensusScore } from '../utils/scoring'

export default function StatsTab({ events, players, trackOpposition, setTrackOpposition }) {
  const myPlayers = players.filter(p => !p.isOpposition)
  const oppPlayer = players.find(p => p.isOpposition)

  const myEvents    = events.filter(e => !oppPlayer || e.playerId !== oppPlayer.id)
  const oppEvents   = events.filter(e => oppPlayer && e.playerId === oppPlayer.id)

  // Team-wide totals for involvement denominator
  const totalActions         = myEvents.length
  const totalPositiveActions = myEvents.filter(e => STAT_CLASSIFICATION[e.statKey] === 'positive').length
  const totalNegativeActions = myEvents.filter(e => STAT_CLASSIFICATION[e.statKey] === 'negative').length

  // Possession split (carry-based)
  const myCarries  = myEvents.filter(e => e.statKey === 'carry').length
  const oppCarries = oppEvents.filter(e => e.statKey === 'carry').length
  const totalCarries = myCarries + oppCarries
  const myPossession = totalCarries > 0 ? Math.round((myCarries / totalCarries) * 100) : null

  // Build per-player stats
  const playerStats = useMemo(() => {
    const map = {}
    myEvents.forEach((ev) => {
      if (!map[ev.playerId]) {
        map[ev.playerId] = { playerId: ev.playerId, playerName: ev.playerName, playerNumber: ev.playerNumber, stats: {}, total: 0, positive: 0, negative: 0 }
      }
      map[ev.playerId].stats[ev.statKey] = (map[ev.playerId].stats[ev.statKey] || 0) + 1
      map[ev.playerId].total++
      const cls = STAT_CLASSIFICATION[ev.statKey]
      if (cls === 'positive') map[ev.playerId].positive++
      if (cls === 'negative') map[ev.playerId].negative++
    })
    return Object.values(map).sort((a, b) => a.playerNumber - b.playerNumber)
  }, [myEvents])

  // Opposition summary
  const oppStats = useMemo(() => {
    const s = {}
    oppEvents.forEach(ev => { s[ev.statKey] = (s[ev.statKey] || 0) + 1 })
    return s
  }, [oppEvents])

  if (events.length === 0) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: 10 }}>
        <OppToggle trackOpposition={trackOpposition} setTrackOpposition={setTrackOpposition} />
        <Empty>No events yet. Capture stats during video playback to see player analysis here.</Empty>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 8px 16px' }}>
      <OppToggle trackOpposition={trackOpposition} setTrackOpposition={setTrackOpposition} />

      {/* ── Possession split ──────────────────────────────────────────────── */}
      {myPossession !== null && (
        <div style={{ marginBottom: 10 }}>
          <SectionLabel>Possession (carry-based)</SectionLabel>
          <div style={{ marginTop: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--brand)' }}>
                Us {myPossession}%
              </span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: 'var(--red)' }}>
                {100 - myPossession}% Opp
              </span>
            </div>
            <div style={{ height: 8, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ height: '100%', width: `${myPossession}%`, background: 'var(--brand)', borderRadius: '2px 0 0 2px' }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Player cards ──────────────────────────────────────────────────── */}
      {playerStats.map((ps) => {
        const player = myPlayers.find(p => p.id === ps.playerId)
        const tackles    = ps.stats.tackle || 0
        const missed     = ps.stats.missed_tackle || 0
        const tackleRate = tackles + missed > 0 ? Math.round((tackles / (tackles + missed)) * 100) : null

        const involvement  = totalActions > 0         ? Math.round((ps.total    / totalActions)         * 100) : 0
        const posInvolve   = totalPositiveActions > 0 ? Math.round((ps.positive / totalPositiveActions) * 100) : 0
        const negInvolve   = totalNegativeActions > 0 ? Math.round((ps.negative / totalNegativeActions) * 100) : 0

        const carryEventsWithM = myEvents.filter(e => e.playerId === ps.playerId && e.statKey === 'carry' && e.meterage != null)
        const avgMeterage = carryEventsWithM.length > 0
          ? (carryEventsWithM.reduce((s, e) => s + e.meterage, 0) / carryEventsWithM.length).toFixed(1)
          : null

        const positiveStats = Object.entries(ps.stats).filter(([k]) => STAT_CLASSIFICATION[k] === 'positive')
        const negativeStats = Object.entries(ps.stats).filter(([k]) => STAT_CLASSIFICATION[k] === 'negative')
        const neutralStats  = Object.entries(ps.stats).filter(([k]) => STAT_CLASSIFICATION[k] === 'neutral')

        return (
          <div key={ps.playerId} style={{
            marginBottom: 8, border: '1px solid var(--border)', borderRadius: 3,
            background: 'var(--panel)', overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '6px 10px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 14, color: 'var(--brand)' }}>
                #{ps.playerNumber}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontWeight: 600, flex: 1, fontSize: 12 }}>
                {ps.playerName}
              </span>
              <Badge color="var(--brand)">{ps.total} actions</Badge>
              {(() => {
                const cs = consensusScore(player)
                if (!cs) return null
                return (
                  <Badge color="var(--amber)" title={
                    cs.hasPeers
                      ? `Your score: ${player.coachScore ?? '—'} · Peer avg: ${cs.peerAvg} · ${cs.count} total scores`
                      : 'Your personal score'
                  }>
                    ⭐ {cs.value}/10{cs.hasPeers ? ` (${cs.count})` : ''}
                  </Badge>
                )
              })()}
              {tackleRate !== null && (
                <Badge color={tackleRate >= 90 ? 'var(--green)' : tackleRate >= 75 ? 'var(--amber)' : 'var(--red)'}>
                  {tackleRate}% tackles
                </Badge>
              )}
            </div>

            {/* Stats split: positive / negative */}
            <div style={{ padding: '6px 10px' }}>
              {positiveStats.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: 'var(--green)', textTransform: 'uppercase', marginRight: 5 }}>▲ Positive</span>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3 }}>
                    {positiveStats.map(([k, v]) => <Badge key={k} color={STAT_COLORS[k]}>{k.replace(/_/g, ' ')}: {v}</Badge>)}
                  </span>
                </div>
              )}
              {negativeStats.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: 'var(--red)', textTransform: 'uppercase', marginRight: 5 }}>▼ Negative</span>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3 }}>
                    {negativeStats.map(([k, v]) => <Badge key={k} color={STAT_COLORS[k]}>{k.replace(/_/g, ' ')}: {v}</Badge>)}
                  </span>
                </div>
              )}
              {neutralStats.length > 0 && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3 }}>
                    {neutralStats.map(([k, v]) => <Badge key={k} color={STAT_COLORS[k]}>{k.replace(/_/g, ' ')}: {v}</Badge>)}
                  </span>
                </div>
              )}
            </div>

            {/* Metrics row */}
            <div style={{
              padding: '4px 10px 6px', borderTop: '1px solid var(--border)',
              display: 'flex', flexWrap: 'wrap', gap: 10,
            }}>
              <Metric label="Involvement" value={`${involvement}%`} />
              <Metric label="+ Positive" value={`${posInvolve}%`} color="var(--green)" />
              {ps.negative > 0 && <Metric label="− Negative" value={`${negInvolve}%`} color="var(--red)" />}
              {avgMeterage !== null && <Metric label="Avg carry" value={`${avgMeterage}m`} color="var(--amber)" />}
            </div>

            {/* Coach comments (read-only here) */}
            {player?.comments && (
              <div style={{
                padding: '4px 10px 6px', borderTop: '1px solid var(--border)',
                fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--muted)',
                fontStyle: 'italic',
              }}>
                "{player.comments}"
              </div>
            )}
          </div>
        )
      })}

      {/* ── Team summary ──────────────────────────────────────────────────── */}
      {playerStats.length > 0 && (
        <TeamSummary myEvents={myEvents} />
      )}

      {/* ── Opposition stats ─────────────────────────────────────────────── */}
      {trackOpposition && oppEvents.length > 0 && (
        <div style={{
          marginTop: 10, border: '1px solid var(--red)', borderRadius: 3,
          background: 'rgba(163,45,45,0.06)',
        }}>
          <div style={{
            padding: '6px 10px', borderBottom: '1px solid rgba(163,45,45,0.3)',
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11,
            letterSpacing: 1.2, color: 'var(--red)', textTransform: 'uppercase',
          }}>
            Opposition Stats
          </div>
          <div style={{ padding: '7px 10px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {Object.entries(oppStats).map(([k, v]) => (
              <Badge key={k} color={STAT_COLORS[k] || 'var(--muted)'}>{k.replace(/_/g, ' ')}: {v}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TeamSummary({ myEvents }) {
  const totals = {}
  myEvents.forEach(ev => { totals[ev.statKey] = (totals[ev.statKey] || 0) + 1 })
  return (
    <div style={{
      border: '1px solid var(--brand)', borderRadius: 3,
      background: 'rgba(232,86,10,0.05)', marginTop: 8,
    }}>
      <div style={{
        padding: '6px 10px', borderBottom: '1px solid rgba(232,86,10,0.3)',
        fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11,
        letterSpacing: 1.2, color: 'var(--brand)', textTransform: 'uppercase',
      }}>
        Team Summary
      </div>
      <div style={{ padding: '7px 10px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Object.entries(totals).map(([k, v]) => (
          <Badge key={k} color={STAT_COLORS[k] || 'var(--muted)'}>
            {k.replace(/_/g, ' ')}: {v}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function OppToggle({ trackOpposition, setTrackOpposition }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button onClick={() => setTrackOpposition(!trackOpposition)} style={{
        background: trackOpposition ? 'rgba(163,45,45,0.18)' : 'transparent',
        color: trackOpposition ? 'var(--red)' : 'var(--muted)',
        border: `1px solid ${trackOpposition ? 'var(--red)' : 'var(--border)'}`,
        padding: '4px 10px', borderRadius: 2,
        fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6, cursor: 'pointer',
      }}>
        {trackOpposition ? '▾ Opposition tracking ON' : '▸ Track opposition stats'}
      </button>
    </div>
  )
}

function Badge({ color, children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
      letterSpacing: 0.3, textTransform: 'uppercase',
      color, border: `1px solid ${color}50`, padding: '2px 7px',
      borderRadius: 2, background: `${color}14`, whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function Metric({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800, color }}>{value}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function Empty({ children }) {
  return (
    <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 12, textAlign: 'center', padding: '40px 20px', lineHeight: 1.8 }}>
      {children}
    </div>
  )
}
