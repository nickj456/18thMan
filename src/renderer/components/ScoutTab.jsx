import React, { useState, useEffect } from 'react'
import { authClient } from '../utils/authClient'
import { STAT_CLASSIFICATION } from '../utils/stats'
import { fmtTime } from '../utils/format'

function toVeoTimestamp(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function veoLink(baseUrl, seconds) {
  if (!baseUrl) return null
  const clean = baseUrl.replace(/#.*$/, '').replace(/\/$/, '')
  return `${clean}/#t=${toVeoTimestamp(seconds)}`
}

// ── Squad review helpers ───────────────────────────────────────────────────────

function buildPlayerData(players, events) {
  const myPlayers = players.filter(p => !p.isOpposition)
  const totalActions = events.filter(e => !players.find(p => p.isOpposition && p.id === e.playerId)).length

  return myPlayers
    .filter(p => events.some(e => e.playerId === p.id))
    .map(p => {
      const pEvents = events.filter(e => e.playerId === p.id)
      const stats = {}
      pEvents.forEach(e => { stats[e.statKey] = (stats[e.statKey] || 0) + 1 })
      const tackles = stats.tackle || 0, missed = stats.missed_tackle || 0
      const carryM = pEvents.filter(e => e.statKey === 'carry' && e.meterage != null)
      return {
        id:          p.id,
        number:      p.number,
        name:        p.name,
        coachScore:  p.coachScore,
        comments:    p.comments,
        stats,
        total:       pEvents.length,
        involvement: totalActions > 0 ? Math.round(pEvents.length / totalActions * 100) : 0,
        tackleRate:  tackles + missed > 0 ? Math.round(tackles / (tackles + missed) * 100) : null,
        avgCarry:    carryM.length > 0 ? +(carryM.reduce((s, e) => s + e.meterage, 0) / carryM.length).toFixed(1) : null,
      }
    })
    .sort((a, b) => a.number - b.number)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ScoutTab({
  events, players, matchInfo, showNotification,
  squadReviews, setSquadReviews,
  sharedReports, setSharedReports,
  authUser,
  videoFile,
}) {
  const [sharingSquad, setSharingSquad] = useState(false)
  const [expandedReview, setExpandedReview] = useState(null)
  const [sharingPlayer, setSharingPlayer] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [coachingGroups, setCoachingGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [veoUrl, setVeoUrl] = useState('')

  useEffect(() => {
    if (!authUser?.id) return
    Promise.all([
      authClient.from('coaching_groups').select('id, name').eq('created_by', authUser.id),
      authClient.from('group_invitations').select('group_id, coaching_groups(id, name)').eq('user_id', authUser.id).eq('status', 'accepted'),
    ]).then(([{ data: owned }, { data: invited }]) => {
      const ownedGroups = owned || []
      const invitedGroups = (invited || []).map(i => i.coaching_groups).filter(Boolean)
      const seen = new Set()
      const all = [...ownedGroups, ...invitedGroups].filter(g => {
        if (seen.has(g.id)) return false
        seen.add(g.id)
        return true
      })
      setCoachingGroups(all)
    })
  }, [authUser?.id])

  useEffect(() => {
    if (videoFile?.veoUrl) setVeoUrl(videoFile.veoUrl)
  }, [videoFile?.veoUrl])

  const myPlayers = players.filter(p => !p.isOpposition)
  const playersWithData = myPlayers.filter(p => events.some(e => e.playerId === p.id))

  // ── Share squad review ─────────────────────────────────────────────────────
  const shareSquadReview = async () => {
    if (playersWithData.length === 0) { showNotification('Log some events first', 'error'); return }

    setSharingSquad(true)
    const playersData = buildPlayerData(players, events)
    const { data, error } = await authClient.from('squad_reviews').insert({
      club:         matchInfo.club || null,
      opposition:   matchInfo.opposition || null,
      match_info:   matchInfo,
      players_data: playersData,
      shared_by:    matchInfo.club || 'Coach',
      group_id:     selectedGroupId || null,
      veo_url:      veoUrl.trim() || null,
    }).select().single()
    setSharingSquad(false)

    if (error) { showNotification('Failed to share: ' + error.message, 'error'); return }

    const review = { ...data, responses: [] }
    setSquadReviews(prev => [review, ...prev])

    const link = `https://18thman.app/review/${data.id}`
    try { await navigator.clipboard.writeText(link) } catch {}
    showNotification('Squad review link copied — send it to your coaches')
  }

  // ── Share individual player ────────────────────────────────────────────────
  const sharePlayer = async (player) => {
    const pEvents = events.filter(e => e.playerId === player.id)
    const stats = {}
    pEvents.forEach(e => { stats[e.statKey] = (stats[e.statKey] || 0) + 1 })
    const totalActions = events.filter(e => !players.find(p => p.isOpposition && p.id === e.playerId)).length
    const statsData = {
      stats,
      total: pEvents.length,
      involvement: totalActions > 0 ? Math.round(pEvents.length / totalActions * 100) : 0,
    }
    setSharingPlayer(player.id)
    const { data, error } = await authClient.from('shared_player_reports').insert({
      player_name: player.name, player_number: player.number,
      club: matchInfo.club || null, match_info: matchInfo,
      stats_data: statsData, coach_notes: player.comments || null,
      coach_score: player.coachScore ?? null, shared_by: matchInfo.club || 'Coach',
    }).select().single()
    setSharingPlayer(null)
    if (error) { showNotification('Failed: ' + error.message, 'error'); return }
    setSharedReports(prev => [{ ...data, responses: [] }, ...prev])
    const link = `https://18thman.app/scout/${data.id}`
    try { await navigator.clipboard.writeText(link) } catch {}
    showNotification(`Link copied for ${player.name}`)
  }

  const copySquadLink = (id) => {
    navigator.clipboard.writeText(`https://18thman.app/review/${id}`).then(() => showNotification('Link copied'))
  }

  const openReviewDashboard = (id) => {
    window.electron?.openExternal(`https://18thman.app/my-reviews/${id}`)
  }

  const deleteReview = async (id) => {
    await authClient.from('squad_review_responses').delete().eq('review_id', id)
    const { error } = await authClient.from('squad_reviews').delete().eq('id', id)
    if (error) { showNotification('Failed to delete review', 'error'); return }
    setSquadReviews(prev => prev.filter(r => r.id !== id))
    if (expandedReview === id) setExpandedReview(null)
    setConfirmDeleteId(null)
    showNotification('Review deleted')
  }

  const copyPlayerLink = (id) => {
    navigator.clipboard.writeText(`https://18thman.app/scout/${id}`).then(() => showNotification('Link copied'))
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '8px 8px 16px' }}>

      {/* ── SQUAD REVIEW (primary) ─────────────────────────────────────────── */}
      <Section label="Squad Review" accent>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
          Share one link with your coaching team. They score every player (1–10) and leave feedback — all responses come back here in real time.
        </p>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
            Veo match URL (optional)
          </div>
          <input
            type="text"
            value={veoUrl}
            onChange={e => setVeoUrl(e.target.value)}
            placeholder="https://app.veo.co/matches/..."
            style={{
              width: '100%', background: 'var(--panel)', color: 'var(--text)',
              border: '1px solid var(--border)', borderRadius: 2,
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '5px 8px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {coachingGroups.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Restrict to group
            </div>
            <select
              value={selectedGroupId}
              onChange={e => setSelectedGroupId(e.target.value)}
              style={{
                width: '100%', background: 'var(--panel)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: 2,
                fontFamily: 'var(--font-ui)', fontSize: 11, padding: '5px 8px',
              }}
            >
              <option value=''>Anyone with the link</option>
              {coachingGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={shareSquadReview}
          disabled={sharingSquad || playersWithData.length === 0}
          style={{
            width: '100%', background: sharingSquad ? 'var(--brand-dim)' : 'var(--brand)',
            color: '#fff', border: 'none', padding: '10px 0', borderRadius: 3,
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 800,
            letterSpacing: 0.8, textTransform: 'uppercase',
            cursor: sharingSquad || playersWithData.length === 0 ? 'not-allowed' : 'pointer',
            opacity: playersWithData.length === 0 ? 0.4 : 1,
            marginBottom: 6,
          }}
        >
          {sharingSquad ? 'Creating…' : `📋 Share Squad Review (${playersWithData.length} players)`}
        </button>
        {playersWithData.length === 0 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-2)', textAlign: 'center' }}>
            Log some events first to include player stats in the review
          </div>
        )}
      </Section>

      {/* Squad review history */}
      {squadReviews.length > 0 && (
        <Section label={`Sent Reviews (${squadReviews.length})`}>
          {squadReviews.map(review => {
            const responseCount = review.responses?.length || 0
            const isExpanded = expandedReview === review.id
            const players = (review.players_data || [])

            return (
              <div key={review.id} style={{
                border: '1px solid var(--border)', borderRadius: 3, marginBottom: 8,
                background: 'var(--bg)', overflow: 'hidden',
              }}>
                {/* Review header */}
                <div
                  onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 12, color: 'var(--text)' }}>
                      {review.opposition ? `vs ${review.opposition}` : 'Squad Review'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)', marginTop: 2 }}>
                      {players.length} players · {new Date(review.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
                    color: responseCount > 0 ? 'var(--green)' : 'var(--muted)',
                    border: `1px solid ${responseCount > 0 ? 'var(--green)' : 'var(--border)'}`,
                    padding: '1px 7px', borderRadius: 2,
                  }}>
                    {responseCount} response{responseCount !== 1 ? 's' : ''}
                  </span>
                  <button onClick={e => { e.stopPropagation(); copySquadLink(review.id) }} style={smallBtn}>COPY LINK</button>
                  <button onClick={e => { e.stopPropagation(); openReviewDashboard(review.id) }} style={smallBtn}>VIEW RESPONSES</button>
                  {review.veo_url && (
                    <button onClick={e => { e.stopPropagation(); window.electron?.openExternal(review.veo_url) }} style={{ ...smallBtn, color: 'var(--brand)', borderColor: 'var(--brand)' }}>▶ VEO</button>
                  )}
                  {confirmDeleteId === review.id ? (
                    <>
                      <button onClick={e => { e.stopPropagation(); deleteReview(review.id) }} style={{ ...smallBtn, color: 'var(--red)', borderColor: 'var(--red)' }}>CONFIRM?</button>
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(null) }} style={smallBtn}>CANCEL</button>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(review.id) }} style={smallBtn}>DELETE</button>
                  )}
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>{isExpanded ? '▲' : '▼'}</span>
                </div>

                {/* Expanded responses */}
                {isExpanded && review.responses?.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '8px 10px' }}>
                    {review.responses.map((resp, ri) => (
                      <div key={ri} style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800, color: 'var(--brand)', letterSpacing: 0.5, marginBottom: 6 }}>
                          {resp.responder}
                        </div>
                        {Object.entries(resp.ratings || {})
                          .filter(([, r]) => r.score)
                          .sort(([a], [b]) => Number(a) - Number(b))
                          .map(([num, r]) => {
                            const pl = players.find(p => String(p.number) === String(num))
                            return (
                              <div key={num} style={{
                                padding: '6px 0', borderBottom: '1px solid var(--border)',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 12, color: 'var(--brand)', minWidth: 32 }}>
                                    #{num}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, flex: 1, color: 'var(--text)' }}>
                                    {pl?.name || ''}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800, color: 'var(--amber)', whiteSpace: 'nowrap' }}>
                                    {r.score}/10
                                  </span>
                                </div>
                                {r.feedback && (
                                  <div style={{
                                    marginTop: 4, paddingLeft: 40,
                                    fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)',
                                    fontStyle: 'italic', lineHeight: 1.55,
                                  }}>
                                    "{r.feedback}"
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (review.responses?.length === 0) && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '10px', fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)' }}>
                    Awaiting responses — send the link to your coaching team.
                  </div>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* ── INDIVIDUAL PLAYER REPORTS (secondary) ─────────────────────────── */}
      <Section label="Individual Player Reports">
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Share a single player's stats for targeted feedback.
        </div>
        {playersWithData.length === 0 ? (
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted)', padding: '6px 0' }}>
            Log some events first.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {playersWithData.map(p => (
              <button
                key={p.id}
                onClick={() => sharePlayer(p)}
                disabled={!!sharingPlayer}
                style={{
                  background: sharingPlayer === p.id ? 'var(--brand-glow)' : 'transparent',
                  color: 'var(--text)', border: '1px solid var(--border)',
                  padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
                  opacity: sharingPlayer && sharingPlayer !== p.id ? 0.5 : 1,
                }}
              >
                {sharingPlayer === p.id ? '…' : `#${p.number} ${p.name}`}
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Individual report history */}
      {sharedReports.length > 0 && (
        <Section label={`Individual Reports (${sharedReports.length})`}>
          {sharedReports.map(report => (
            <div key={report.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', marginBottom: 5,
              border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg)',
            }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', fontSize: 12 }}>
                #{report.player_number} {report.player_name}
              </span>
              <span style={{ flex: 1 }} />
              <span style={{
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
                color: (report.responses?.length || 0) > 0 ? 'var(--green)' : 'var(--muted)',
                border: `1px solid ${(report.responses?.length || 0) > 0 ? 'var(--green)' : 'var(--border)'}`,
                padding: '1px 6px', borderRadius: 2,
              }}>
                {report.responses?.length || 0} response{(report.responses?.length || 0) !== 1 ? 's' : ''}
              </span>
              <button onClick={() => copyPlayerLink(report.id)} style={smallBtn}>COPY LINK</button>
            </div>
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ label, children, accent }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800,
        letterSpacing: 1.2, color: accent ? 'var(--brand)' : 'var(--muted)',
        textTransform: 'uppercase',
        borderBottom: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
        paddingBottom: 5, marginBottom: 10,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const smallBtn = {
  background: 'transparent', color: 'var(--muted)',
  border: '1px solid var(--border)', padding: '2px 7px', borderRadius: 2,
  fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, cursor: 'pointer',
  whiteSpace: 'nowrap',
}
