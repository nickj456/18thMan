import { fmtTime } from './format'
import { STAT_CLASSIFICATION, STAT_COLORS_HEX } from './stats'
import { consensusScore } from './scoring'

const POSITIVE_STAT_LABELS = {
  try:        (n) => n > 1 ? `${n} tries — outstanding effort!` : `scored a try — brilliant!`,
  tackle:     (n) => `made ${n} tackle${n > 1 ? 's' : ''} — solid defensive work`,
  carry:      (n, avg) => `carried the ball ${n} time${n > 1 ? 's' : ''}${avg ? ` (avg ${avg}m)` : ''} — great ball-carrying threat`,
  line_break: (n) => `broke the line ${n} time${n > 1 ? 's' : ''} — explosive in attack`,
  support:    (n) => `made ${n} support run${n > 1 ? 's' : ''} — excellent team play`,
  offload:    (n) => `completed ${n} offload${n > 1 ? 's' : ''} — smart skill under pressure`,
  penalty_won:(n) => `won ${n} penalt${n > 1 ? 'ies' : 'y'} — disciplined and smart`,
  intercept:  (n) => `made ${n} intercept${n > 1 ? 's' : ''} — great reading of the game`,
}

// ── CSV ────────────────────────────────────────────────────────────────────────

// Default export sections — all on
export const DEFAULT_EXPORT_SECTIONS = {
  matchInfo:      true,
  playerStats:    true,
  coachNotes:     true,
  eventsTimeline: true,
}

export function exportCsv(events, players, matchInfo = {}, sections = DEFAULT_EXPORT_SECTIONS) {
  const myPlayers = players?.filter(p => !p.isOpposition) || []
  const parts = []

  // Match info header block
  if (sections.matchInfo) {
    const hasScore = matchInfo.ourScore !== '' || matchInfo.oppScore !== ''
    const scoreStr = hasScore ? `${matchInfo.ourScore || 0} - ${matchInfo.oppScore || 0}` : ''
    const metaRows = [
      ['Match Report'],
      matchInfo.club        ? ['Club',        matchInfo.club]        : null,
      matchInfo.opposition  ? ['Opposition',  matchInfo.opposition]  : null,
      hasScore              ? ['Score',       scoreStr]              : null,
      matchInfo.date        ? ['Date',        matchInfo.date]        : null,
      [''],
    ].filter(Boolean).map(r => r.join(',')).join('\n')
    parts.push(metaRows)
  }

  // Player stats summary
  if (sections.playerStats) {
    const statKeys = [...new Set(events.map(e => e.statKey))]
    const summaryHeader = ['Player #', 'Player Name', ...statKeys, sections.coachNotes ? 'Coach Score' : null, sections.coachNotes ? 'Comments' : null].filter(Boolean).join(',')
    const summaryRows = myPlayers.map(p => {
      const counts = statKeys.map(k => events.filter(e => e.playerId === p.id && e.statKey === k).length)
      const extra = sections.coachNotes ? [p.coachScore ?? '', `"${(p.comments || '').replace(/"/g, '""')}"`] : []
      return [p.number, `"${p.name}"`, ...counts, ...extra].join(',')
    })
    parts.push(['Player Statistics', summaryHeader, ...summaryRows, ''].join('\n'))
  }

  // Events timeline
  if (sections.eventsTimeline) {
    const totalActions = events.length
    const playerTotals = {}
    events.forEach(ev => { playerTotals[ev.playerId] = (playerTotals[ev.playerId] || 0) + 1 })
    const tackleTotals = {}
    events.forEach(ev => {
      if (!tackleTotals[ev.playerId]) tackleTotals[ev.playerId] = { t: 0, m: 0 }
      if (ev.statKey === 'tackle') tackleTotals[ev.playerId].t++
      if (ev.statKey === 'missed_tackle') tackleTotals[ev.playerId].m++
    })

    const timelineHeader = ['Half', 'Time', 'Player #', 'Player Name', 'Stat', 'Class', 'Meterage',
      sections.coachNotes ? 'Coach Score' : null, 'Involvement %', 'Tackle Success %'].filter(Boolean).join(',')

    const rows = events.map((ev) => {
      const player = myPlayers.find(p => p.id === ev.playerId)
      const cls    = STAT_CLASSIFICATION[ev.statKey] || 'neutral'
      const involve = totalActions > 0 ? Math.round(((playerTotals[ev.playerId] || 0) / totalActions) * 100) : 0
      const tt = tackleTotals[ev.playerId] || { t: 0, m: 0 }
      const tackleRate = tt.t + tt.m > 0 ? Math.round((tt.t / (tt.t + tt.m)) * 100) : ''
      const scoreCol = sections.coachNotes ? [player?.coachScore ?? ''] : []
      return [
        ev.half, fmtTime(ev.timestamp), ev.playerNumber, `"${ev.playerName}"`,
        `"${ev.statLabel}"`, cls, ev.meterage ?? '',
        ...scoreCol, involve + '%', tackleRate ? tackleRate + '%' : '',
      ].join(',')
    })
    parts.push(['Events Timeline', timelineHeader, ...rows].join('\n'))
  }

  const csv = parts.join('\n\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `match-stats-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Parent email ───────────────────────────────────────────────────────────────

export function generateParentEmail({ player, events, matchInfo = {}, sharedReports = [], squadReviews = [] }) {
  const myEvents = events.filter(e => e.playerId === player.id)

  // Responses from individual player share links
  const playerReports = sharedReports.filter(r => r.player_number === player.number)
  const reportResponses = playerReports.flatMap(r => r.responses || [])

  // Responses from squad review forms — extract this player's feedback by number
  const reviewResponses = squadReviews.flatMap(review =>
    (review.responses || []).flatMap(resp => {
      const rating = resp.ratings?.[String(player.number)] || resp.ratings?.[player.number]
      if (!rating?.feedback?.trim()) return []
      return [{ responder: resp.responder, response: rating.feedback.trim() }]
    })
  )

  // Combine both sources — squad review feedback + individual report responses
  const scoutResponses = [...reportResponses, ...reviewResponses]
  const statCounts = {}
  myEvents.forEach(e => { statCounts[e.statKey] = (statCounts[e.statKey] || 0) + 1 })

  const carryWithM = myEvents.filter(e => e.statKey === 'carry' && e.meterage != null)
  const avgM = carryWithM.length > 0
    ? Math.round(carryWithM.reduce((s, e) => s + e.meterage, 0) / carryWithM.length)
    : null

  const opposition = matchInfo.opposition || 'the opposition'
  const club       = matchInfo.club || 'the team'
  // Use consensus score (average of personal + peer scores) for messaging tier
  const cs    = consensusScore(player)
  const score = cs?.value ?? player.coachScore  // consensus if available, else personal

  // ── Score-based dynamic messaging ─────────────────────────────────────────
  const messaging = (() => {
    if (score >= 9) return {
      subject:  `${player.name} — Exceptional performance today! 🌟`,
      emoji:    '🌟',
      intro:    `We had to reach out straight after today's match &mdash; <strong style="color:#e8560a;">${player.name} was outstanding.</strong> One of those performances everyone on the touchline was talking about!`,
      closing:  `Truly exceptional today. You should be incredibly proud &mdash; performances like that are what coaching is all about. Thank you for everything you do at home to support ${player.name}!`,
    }
    if (score >= 7) return {
      subject:  `${player.name} — Brilliant performance today! ⭐`,
      emoji:    '⭐',
      intro:    `What a performance! We just had to reach out and share how well <strong style="color:#e8560a;">${player.name} played today</strong> against ${opposition}. Here are the highlights:`,
      closing:  `${player.name} is a real credit to the squad. Their attitude and effort today was exactly what we ask for. Your support at home clearly makes a difference &mdash; thank you!`,
    }
    if (score >= 5) return {
      subject:  `${player.name} — Solid contribution today 👍`,
      emoji:    '👍',
      intro:    `We wanted to share what a solid contribution <strong style="color:#e8560a;">${player.name} made today</strong> against ${opposition}. There was plenty to be pleased about:`,
      closing:  `A good all-round performance today from ${player.name}. They're developing well and we're excited about what's ahead. Thank you for your continued support!`,
    }
    if (score >= 1) return {
      subject:  `${player.name} — Match performance update`,
      emoji:    '📋',
      intro:    `We wanted to share how <strong style="color:#e8560a;">${player.name} got on today</strong> against ${opposition}. Here are some positives from the match:`,
      closing:  `${player.name} gave their best today and every match is a learning experience. Your encouragement at home means a great deal &mdash; thank you!`,
    }
    // No score
    return {
      subject:  `${player.name} — Match performance update`,
      emoji:    '⭐',
      intro:    `We just wanted to share what a great performance <strong style="color:#e8560a;">${player.name} put in today</strong> against ${opposition}. Here are some highlights:`,
      closing:  `${player.name} is a pleasure to coach and a real asset to ${club}. Your support at home makes all the difference &mdash; thank you!`,
    }
  })()

  // ── Match date display ─────────────────────────────────────────────────────
  const matchDate = matchInfo.date
    ? new Date(matchInfo.date + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // ── Score dots ─────────────────────────────────────────────────────────────
  const scoreDots = score != null
    ? Array.from({ length: 10 }, (_, i) =>
        `<span style="color:${i < score ? '#e8560a' : '#e0e0e0'};font-size:16px;">&#9679;</span>`
      ).join('&thinsp;') + `<span style="font-size:12px;color:#e8560a;font-weight:800;margin-left:8px;">${score}/10</span>`
    : null

  // ── Stat rows ──────────────────────────────────────────────────────────────
  const ICONS = { try:'🏉', tackle:'💪', carry:'🔥', line_break:'⚡', support:'🤝', offload:'👌', penalty_won:'✅', intercept:'🎯' }
  const statRows = Object.entries(statCounts)
    .filter(([k]) => STAT_CLASSIFICATION[k] === 'positive' && POSITIVE_STAT_LABELS[k])
    .map(([k, v], i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
        <td style="padding:11px 14px;width:36px;font-size:18px;vertical-align:middle;">${ICONS[k] || '⭐'}</td>
        <td style="padding:11px 14px 11px 0;font-size:14px;color:#333;line-height:1.4;vertical-align:middle;">
          ${player.name} ${POSITIVE_STAT_LABELS[k](v, k === 'carry' ? avgM : null)}
        </td>
      </tr>`)
    .join('')

  // ── Plain text ─────────────────────────────────────────────────────────────
  const highlightLines = Object.entries(statCounts)
    .filter(([k]) => STAT_CLASSIFICATION[k] === 'positive' && POSITIVE_STAT_LABELS[k])
    .map(([k, v]) => `• ${player.name} ${POSITIVE_STAT_LABELS[k](v, k === 'carry' ? avgM : null)}`)

  const text = [
    `Hi,`, ``,
    `${player.name} put in a great performance today against ${opposition}!`, ``,
    ...highlightLines, ``,
    ...(score != null ? [`Coach Score: ${score}/10`, ``] : []),
    ...(player.comments?.trim() ? [`From the coaching team: "${player.comments}"`, ``] : []),
    ...(scoutResponses.length > 0 ? [
      `Coaching feedback:`,
      ...scoutResponses.map(r => `"${r.response}" — ${r.responder}`), ``,
    ] : []),
    messaging.closing, ``, `Kind regards,`, `The Coaching Team`,
  ].join('\n')

  // ── HTML ───────────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:580px;margin:0 auto;padding:24px 0 40px;">

  <!-- Header bar — dark so logo is visible -->
  <div style="background:#07080d;border-radius:8px 8px 0 0;padding:18px 24px;display:flex;align-items:center;gap:12px;">
    <img src="https://18thman.app/logo.png" alt="18th Man" width="42" height="42" style="display:block;border-radius:4px;flex-shrink:0;">
    <div>
      <div style="font-size:17px;font-weight:800;font-style:italic;color:#e8560a;letter-spacing:0.5px;line-height:1;">18th Man</div>
      <div style="font-size:9px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;margin-top:3px;">Match Performance Report</div>
    </div>
  </div>
  <div style="height:4px;background:#e8560a;"></div>

  <!-- Player hero -->
  <div style="background:#fff;padding:24px 28px 20px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:26px;font-weight:800;color:#1a1a1a;line-height:1.1;">${player.name} ${messaging.emoji}</div>
        <div style="font-size:13px;color:#888;margin-top:6px;line-height:1.6;">
          ${club}${matchInfo.opposition ? ` &middot; vs ${matchInfo.opposition}` : ''}
          ${matchDate ? `<br>${matchDate}` : ''}
          ${(matchInfo.ourScore != null && matchInfo.ourScore !== '' && matchInfo.oppScore != null && matchInfo.oppScore !== '') ? `<br><strong style="color:#e8560a;">${matchInfo.ourScore} &ndash; ${matchInfo.oppScore}</strong>` : ''}
        </div>
      </div>
      ${scoreDots ? `
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#aaa;margin-bottom:5px;">Coach Score</div>
        <div>${scoreDots}</div>
      </div>` : ''}
    </div>
    <div style="height:3px;background:#e8560a;border-radius:2px;margin-top:18px;"></div>
  </div>

  <!-- Body -->
  <div style="background:#fff;padding:24px 28px;border-left:1px solid #e8e8e8;border-right:1px solid #e8e8e8;">

    <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 22px;">${messaging.intro}</p>

    <!-- Stat highlights -->
    ${statRows ? `
    <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden;margin-bottom:24px;">
      <tbody>${statRows}</tbody>
    </table>` : ''}

    <!-- Coach score bar (if no inline display) -->

    <!-- Coach comments -->
    ${player.comments?.trim() ? `
    <div style="border-left:4px solid #e8560a;background:#fff8f5;padding:14px 16px;border-radius:0 4px 4px 0;margin-bottom:20px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#e8560a;margin-bottom:6px;">From the coaching team</div>
      <div style="font-size:14px;color:#444;line-height:1.7;font-style:italic;">"${player.comments}"</div>
    </div>` : ''}

    <!-- Scout feedback -->
    ${scoutResponses.length > 0 ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#555;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eee;">
        What coaches are saying
      </div>
      ${scoutResponses.map(r => `
      <div style="padding:10px 14px;background:#f9fafb;border-left:3px solid #d1d5db;border-radius:0 4px 4px 0;margin-bottom:8px;">
        <div style="font-size:13px;color:#333;line-height:1.6;font-style:italic;">"${r.response}"</div>
        <div style="font-size:11px;color:#aaa;margin-top:4px;font-weight:600;">&mdash; ${r.responder}</div>
      </div>`).join('')}
    </div>` : ''}

    <!-- Closing -->
    <p style="font-size:14px;color:#555;line-height:1.8;margin:0;">${messaging.closing}</p>
  </div>

  <!-- Footer -->
  <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-top:none;border-radius:0 0 8px 8px;padding:14px 28px;text-align:center;">
    <div style="font-size:11px;color:#bbb;">18th Man Match Analyst &middot; Rugby League Coaching Platform</div>
    <div style="font-size:11px;color:#ddd;margin-top:2px;">18thman.app</div>
  </div>

</div>
</body>
</html>`

  return { subject: messaging.subject, html, text }
}

// ── SVG bar chart for PDF ──────────────────────────────────────────────────────

function svgBarChart(stats, maxCount) {
  if (!stats || Object.keys(stats).length === 0) return ''
  const entries = Object.entries(stats)
  const W = 320, LABEL_W = 96, BAR_AREA = W - LABEL_W - 36, ROW = 20
  const H = entries.length * ROW + 6

  const bars = entries.map(([key, val], i) => {
    const bw   = maxCount > 0 ? Math.round((val / maxCount) * BAR_AREA) : 0
    const y    = i * ROW + 3
    const col  = STAT_COLORS_HEX[key] || '#888'
    const cls  = STAT_CLASSIFICATION[key] || 'neutral'
    const fill = cls === 'positive' ? col : cls === 'negative' ? col : '#888'
    return `
      <text x="${LABEL_W - 4}" y="${y + 13}" text-anchor="end" font-size="8.5" fill="#555" font-family="Helvetica,Arial,sans-serif">${key.replace(/_/g, ' ')}</text>
      <rect x="${LABEL_W}" y="${y + 2}" width="${Math.max(bw, 1)}" height="13" fill="${fill}cc" rx="1.5"/>
      <text x="${LABEL_W + bw + 4}" y="${y + 13}" font-size="8.5" fill="#333" font-family="Helvetica,Arial,sans-serif" font-weight="bold">${val}</text>`
  }).join('')

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${W}px;display:block;">${bars}</svg>`
}

function scoreDotsHtml(score) {
  if (score == null) return '<span style="color:#aaa;font-size:9pt;">Not scored</span>'
  return Array.from({ length: 10 }, (_, i) => i + 1)
    .map(n => `<span style="color:${n <= score ? '#e8560a' : '#ddd'};font-size:11pt;margin-right:1px;">●</span>`)
    .join('') + ` <span style="color:#e8560a;font-weight:700;font-size:9pt;">${score}/10</span>`
}

// ── Coach PDF ──────────────────────────────────────────────────────────────────

export function generatePdfHtml({ events, players, clips, matchInfo, sharedReports = [], sections = DEFAULT_EXPORT_SECTIONS }) {
  const ORANGE = '#e8560a'
  const myPlayers  = players.filter(p => !p.isOpposition)
  const oppPlayer  = players.find(p => p.isOpposition)
  const myEvents   = events.filter(e => !oppPlayer || e.playerId !== oppPlayer.id)
  const oppEvents  = events.filter(e => oppPlayer && e.playerId === oppPlayer.id)

  const displayDate = matchInfo.date
    ? new Date(matchInfo.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Team totals
  const totalActions         = myEvents.length
  const totalPositiveActions = myEvents.filter(e => STAT_CLASSIFICATION[e.statKey] === 'positive').length
  const totalNegativeActions = myEvents.filter(e => STAT_CLASSIFICATION[e.statKey] === 'negative').length

  const teamTotals = {}
  myEvents.forEach(ev => { teamTotals[ev.statKey] = (teamTotals[ev.statKey] || 0) + 1 })

  const oppTotals = {}
  oppEvents.forEach(ev => { oppTotals[ev.statKey] = (oppTotals[ev.statKey] || 0) + 1 })

  const myCarries  = myEvents.filter(e => e.statKey === 'carry').length
  const oppCarries = oppEvents.filter(e => e.statKey === 'carry').length
  const totalCarries = myCarries + oppCarries
  const myPoss   = totalCarries > 0 ? Math.round(myCarries / totalCarries * 100) : null
  const hasScore = matchInfo.ourScore !== '' || matchInfo.oppScore !== ''

  // Per-player stats
  const playerStatsMap = {}
  myEvents.forEach(ev => {
    if (!playerStatsMap[ev.playerId]) {
      playerStatsMap[ev.playerId] = {
        playerId: ev.playerId, playerName: ev.playerName, playerNumber: ev.playerNumber,
        stats: {}, total: 0, positive: 0, negative: 0,
      }
    }
    playerStatsMap[ev.playerId].stats[ev.statKey] = (playerStatsMap[ev.playerId].stats[ev.statKey] || 0) + 1
    playerStatsMap[ev.playerId].total++
    const cls = STAT_CLASSIFICATION[ev.statKey]
    if (cls === 'positive') playerStatsMap[ev.playerId].positive++
    if (cls === 'negative') playerStatsMap[ev.playerId].negative++
  })
  const sortedPlayerStats = Object.values(playerStatsMap).sort((a, b) => a.playerNumber - b.playerNumber)

  // Global max stat count (for bar chart scaling)
  const globalMax = Math.max(1, ...Object.values(playerStatsMap).flatMap(ps => Object.values(ps.stats)))

  // ── Summary page ────────────────────────────────────────────────────
  const teamBadgesHtml = Object.entries(teamTotals)
    .map(([k, v]) => `<span class="sbadge" style="border-color:${STAT_COLORS_HEX[k] || '#aaa'}66;color:${STAT_COLORS_HEX[k] || '#555'};background:${STAT_COLORS_HEX[k] || '#aaa'}15;">${k.replace(/_/g, ' ')}: <strong>${v}</strong></span>`)
    .join('')

  const oppBadgesHtml = Object.entries(oppTotals)
    .map(([k, v]) => `<span class="sbadge" style="border-color:#A32D2D66;color:#A32D2D;background:#A32D2D15;">${k.replace(/_/g, ' ')}: <strong>${v}</strong></span>`)
    .join('')

  const teamSummaryRows = sortedPlayerStats.map(ps => {
    const inv = totalActions > 0 ? Math.round(ps.total / totalActions * 100) : 0
    const tt = (ps.stats.tackle||0), mm = (ps.stats.missed_tackle||0)
    const tr = tt + mm > 0 ? Math.round(tt / (tt + mm) * 100) : null
    const player = myPlayers.find(p => p.id === ps.playerId)
    return `<tr>
      <td><strong style="color:${ORANGE}">#${ps.playerNumber}</strong> ${ps.playerName}</td>
      <td class="tc">${ps.total}</td>
      <td class="tc">${ps.positive}</td>
      <td class="tc" style="color:#A32D2D">${ps.negative}</td>
      <td class="tc">${inv}%</td>
      <td class="tc">${tr !== null ? tr + '%' : '—'}</td>
      <td class="tc">${(() => { const sc = consensusScore(player); return sc ? sc.value + '/10' + (sc.count > 1 ? ` (${sc.count})` : '') : '—' })()}</td>
    </tr>`
  }).join('')

  // ── Per-player pages ─────────────────────────────────────────────────
  const playerPagesHtml = sortedPlayerStats.map((ps) => {
    const player = myPlayers.find(p => p.id === ps.playerId)
    const tackles    = ps.stats.tackle || 0
    const missed     = ps.stats.missed_tackle || 0
    const tackleRate = tackles + missed > 0 ? Math.round(tackles / (tackles + missed) * 100) : null

    const involvement  = totalActions         > 0 ? Math.round(ps.total    / totalActions         * 100) : 0
    const posInvolve   = totalPositiveActions > 0 ? Math.round(ps.positive / totalPositiveActions * 100) : 0
    const negInvolve   = totalNegativeActions > 0 ? Math.round(ps.negative / totalNegativeActions * 100) : 0

    const carryWithM = myEvents.filter(e => e.playerId === ps.playerId && e.statKey === 'carry' && e.meterage != null)
    const avgM = carryWithM.length > 0
      ? (carryWithM.reduce((s, e) => s + e.meterage, 0) / carryWithM.length).toFixed(1)
      : null

    // Consensus score (personal + peer average)
    const cs = consensusScore(player)

    // Scout feedback from other coaches for this player (matched by number)
    const scoutFeedback = sharedReports
      .filter(r => r.player_number === ps.playerNumber)
      .flatMap(r => r.responses || [])

    const positiveStatsStr = Object.entries(ps.stats)
      .filter(([k]) => STAT_CLASSIFICATION[k] === 'positive')
      .map(([k, v]) => `<span class="sbadge" style="color:${STAT_COLORS_HEX[k]||'#555'};border-color:${STAT_COLORS_HEX[k]||'#aaa'}66;background:${STAT_COLORS_HEX[k]||'#aaa'}15;">${k.replace(/_/g,' ')}: <strong>${v}</strong></span>`)
      .join('')

    const negativeStatsStr = Object.entries(ps.stats)
      .filter(([k]) => STAT_CLASSIFICATION[k] === 'negative')
      .map(([k, v]) => `<span class="sbadge" style="color:${STAT_COLORS_HEX[k]||'#A32D2D'};border-color:${STAT_COLORS_HEX[k]||'#A32D2D'}66;background:#A32D2D15;">${k.replace(/_/g,' ')}: <strong>${v}</strong></span>`)
      .join('')

    const neutralStatsStr = Object.entries(ps.stats)
      .filter(([k]) => STAT_CLASSIFICATION[k] === 'neutral')
      .map(([k, v]) => `<span class="sbadge">${k.replace(/_/g,' ')}: <strong>${v}</strong></span>`)
      .join('')

    return `
    <div class="player-page">
      <!-- Player header -->
      <div class="player-page-head">
        <div class="player-big-num">#${ps.playerNumber}</div>
        <div>
          <div class="player-big-name">${ps.playerName}</div>
          <div class="player-meta">
            ${matchInfo.club || 'Your Club'}${matchInfo.opposition ? ' vs ' + matchInfo.opposition : ''}${hasScore ? ' · ' + (matchInfo.ourScore || 0) + '–' + (matchInfo.oppScore || 0) : ''} · ${displayDate}
          </div>
        </div>
        <div style="margin-left:auto;text-align:right;">
          <div class="meta-label">${cs?.hasPeers ? 'Consensus Score' : 'Coach Score'}</div>
          <div style="margin-top:3pt;">${scoreDotsHtml(cs?.value ?? player?.coachScore)}</div>
          ${cs?.hasPeers ? `<div style="font-size:7pt;color:#aaa;margin-top:2pt;">${cs.count} scores averaged</div>` : ''}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12pt;margin-bottom:14pt;">
        <!-- Stats + bar chart -->
        <div>
          <div class="section-head" style="margin-bottom:8pt;">Performance Stats</div>
          ${svgBarChart(ps.stats, globalMax)}
          <div style="margin-top:8pt;">
            ${positiveStatsStr ? `<div style="margin-bottom:5pt;"><span class="pos-label">▲ Positive</span> ${positiveStatsStr}</div>` : ''}
            ${negativeStatsStr ? `<div style="margin-bottom:5pt;"><span class="neg-label">▼ Negative</span> ${negativeStatsStr}</div>` : ''}
            ${neutralStatsStr  ? `<div>${neutralStatsStr}</div>` : ''}
          </div>
        </div>

        <!-- Metrics -->
        <div>
          <div class="section-head" style="margin-bottom:8pt;">Key Metrics</div>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-label">Actions</div>
              <div class="metric-val">${ps.total}</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Involvement</div>
              <div class="metric-val">${involvement}%</div>
            </div>
            <div class="metric-card" style="border-top:2pt solid #3B6D11;">
              <div class="metric-label">+ Involvement</div>
              <div class="metric-val" style="color:#3B6D11;">${posInvolve}%</div>
            </div>
            ${ps.negative > 0 ? `
            <div class="metric-card" style="border-top:2pt solid #A32D2D;">
              <div class="metric-label">− Involvement</div>
              <div class="metric-val" style="color:#A32D2D;">${negInvolve}%</div>
            </div>` : ''}
            ${tackleRate !== null ? `
            <div class="metric-card" style="border-top:2pt solid ${tackleRate >= 80 ? '#3B6D11' : tackleRate >= 60 ? '#f59e0b' : '#A32D2D'};">
              <div class="metric-label">Tackle Success</div>
              <div class="metric-val" style="color:${tackleRate >= 80 ? '#3B6D11' : tackleRate >= 60 ? '#f59e0b' : '#A32D2D'};">${tackleRate}%</div>
            </div>` : ''}
            ${avgM ? `
            <div class="metric-card" style="border-top:2pt solid #f59e0b;">
              <div class="metric-label">Avg Carry</div>
              <div class="metric-val" style="color:#f59e0b;">${avgM}m</div>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Coach notes -->
      ${sections.coachNotes ? `<div style="border:1pt solid #e0e0e0;border-radius:3pt;padding:10pt 12pt;${scoutFeedback.length ? '' : 'min-height:60pt;'}">
        <div class="section-head" style="margin-bottom:6pt;">Coach Notes</div>
        <div style="font-size:9pt;color:${player?.comments?.trim() ? '#333' : '#bbb'};font-style:${player?.comments?.trim() ? 'normal' : 'italic'};line-height:1.6;">
          ${player?.comments?.trim() || 'No notes added for this player.'}
        </div>
      </div>` : ''}

      <!-- Scout feedback from other coaches -->
      ${scoutFeedback.length > 0 ? `
      <div style="margin-top:10pt;border:1pt solid #e0e0e0;border-radius:3pt;overflow:hidden;">
        <div class="section-head" style="padding:6pt 10pt;margin:0;border-radius:0;background:#f9fafb;">
          Scout Feedback (${scoutFeedback.length})
        </div>
        ${scoutFeedback.map(r => `
        <div style="padding:8pt 10pt;border-top:0.5pt solid #f0f0f0;">
          <div style="font-size:8pt;font-weight:800;color:${ORANGE};letter-spacing:0.5px;text-transform:uppercase;margin-bottom:3pt;">${r.responder}</div>
          <div style="font-size:9pt;color:#333;line-height:1.6;font-style:italic;">"${r.response}"</div>
          <div style="font-size:7.5pt;color:#aaa;margin-top:2pt;">${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        </div>`).join('')}
      </div>` : ''}
    </div>`
  }).join('')

  // ── Events table ─────────────────────────────────────────────────────
  const eventRowsHtml = myEvents.map((ev, i) => {
    const cls = STAT_CLASSIFICATION[ev.statKey] || 'neutral'
    const clsCol = cls === 'positive' ? '#3B6D11' : cls === 'negative' ? '#A32D2D' : '#888'
    return `<tr class="${i % 2 ? 'row-alt' : ''}">
      <td class="mono">${fmtTime(ev.timestamp)}</td>
      <td>${ev.half}</td>
      <td><strong style="color:${ORANGE}">#${ev.playerNumber}</strong> ${ev.playerName}</td>
      <td>${ev.statLabel}</td>
      <td style="color:${clsCol};font-weight:700;font-size:7pt;">${cls.toUpperCase()}</td>
      <td class="mono">${ev.meterage != null ? ev.meterage + 'm' : ''}</td>
    </tr>`
  }).join('')

  const clipRowsHtml = clips.map((c, i) => `
    <tr class="${i % 2 ? 'row-alt' : ''}">
      <td>${c.label}</td>
      <td class="mono">${fmtTime(c.inPoint)}</td>
      <td class="mono">${fmtTime(c.outPoint)}</td>
      <td class="mono">${fmtTime(c.outPoint - c.inPoint)}</td>
      <td>${c.status.toUpperCase()}</td>
    </tr>`).join('')

  const CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, Helvetica, sans-serif;
      font-size: 9.5pt; line-height: 1.55; color: #1a1a1a; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
      padding: 16mm 20mm 14mm 20mm;
    }
    body::before {
      content: ''; display: block; height: 3.5pt; background: ${ORANGE};
      margin: -16mm -20mm 12mm -20mm;
    }
    .report-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #999; text-align: center; margin-bottom: 8pt; }
    .match-title { font-size: 20pt; font-weight: 800; margin-bottom: 8pt; line-height: 1.1; }
    .divider { height: 0.75pt; background: #e0e0e0; margin: 8pt 0; }
    .divider-orange { height: 0.75pt; background: ${ORANGE}; margin: 8pt 0 10pt 0; }
    .meta-row { display: flex; gap: 24pt; flex-wrap: wrap; margin-bottom: 12pt; }
    .meta-label { font-size: 7pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: ${ORANGE}; display: block; margin-bottom: 1pt; }
    .meta-value { font-size: 10pt; font-weight: 700; }
    .section { margin-bottom: 14pt; }
    .section-head { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #1a1a1a; padding-bottom: 4pt; border-bottom: 1.5pt solid ${ORANGE}; margin-bottom: 8pt; }
    .sbadge { display: inline-block; font-size: 7.5pt; background: #f2f2f2; border: 0.5pt solid #ddd; padding: 1.5pt 5pt; border-radius: 2pt; white-space: nowrap; color: #333; margin: 1pt; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    thead tr { border-bottom: 1.5pt solid ${ORANGE}; background: #fafafa; }
    th { text-align: left; padding: 4pt 6pt; font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #666; }
    td { padding: 4pt 6pt; border-bottom: 0.5pt solid #f0f0f0; vertical-align: top; }
    .row-alt td { background: #fafafa; }
    tr:last-child td { border-bottom: none; }
    .tc { text-align: center; }
    .mono { font-family: 'Courier New', Courier, monospace; font-size: 8pt; }
    .pos-label { font-size: 7pt; font-weight: 800; color: #3B6D11; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4pt; }
    .neg-label { font-size: 7pt; font-weight: 800; color: #A32D2D; text-transform: uppercase; letter-spacing: 0.5px; margin-right: 4pt; }
    /* Player pages */
    .player-page { page-break-before: always; padding-top: 6pt; }
    .player-page-head { display: flex; align-items: flex-start; gap: 12pt; margin-bottom: 14pt; padding-bottom: 10pt; border-bottom: 1.5pt solid ${ORANGE}; }
    .player-big-num { font-size: 36pt; font-weight: 800; font-style: italic; color: ${ORANGE}; line-height: 1; }
    .player-big-name { font-size: 18pt; font-weight: 800; color: #1a1a1a; line-height: 1.1; }
    .player-meta { font-size: 8pt; color: #888; margin-top: 3pt; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6pt; }
    .metric-card { border: 0.75pt solid #e4e4e4; border-radius: 2pt; padding: 6pt 8pt; }
    .metric-label { font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 3pt; }
    .metric-val { font-size: 16pt; font-weight: 800; color: #1a1a1a; line-height: 1; }
    /* Possession bar */
    .poss-bar { height: 10pt; border-radius: 2pt; overflow: hidden; background: #f0f0f0; margin-top: 4pt; border: 0.5pt solid #e0e0e0; }
    .poss-fill { height: 100%; background: ${ORANGE}; }
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${CSS}</style>
</head>
<body>

<!-- ── Summary page ────────────────────────────── -->
<div class="report-label">Coach Match Analysis Report</div>
<div class="match-title">${matchInfo.opposition ? `vs ${matchInfo.opposition}` : 'Match Analysis'}</div>
<div class="divider-orange"></div>

${hasScore ? `
<div style="display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:12pt;padding:10pt 0;border-bottom:0.75pt solid #e0e0e0;">
  <div style="text-align:center;flex:1;">
    <div style="font-size:7pt;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${ORANGE};margin-bottom:4pt;">${matchInfo.club || 'Us'}</div>
    <div style="font-size:36pt;font-weight:800;font-style:italic;color:#1a1a1a;line-height:1;">${matchInfo.ourScore || '0'}</div>
  </div>
  <div style="font-size:22pt;font-weight:800;color:#ccc;padding:0 12pt;padding-top:14pt;">–</div>
  <div style="text-align:center;flex:1;">
    <div style="font-size:7pt;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#888;margin-bottom:4pt;">${matchInfo.opposition || 'Opposition'}</div>
    <div style="font-size:36pt;font-weight:800;font-style:italic;color:#1a1a1a;line-height:1;">${matchInfo.oppScore || '0'}</div>
  </div>
</div>` : ''}

<div class="meta-row">
  ${matchInfo.club       ? `<div><span class="meta-label">Club</span><span class="meta-value">${matchInfo.club}</span></div>` : ''}
  ${matchInfo.opposition ? `<div><span class="meta-label">Opposition</span><span class="meta-value">${matchInfo.opposition}</span></div>` : ''}
  ${hasScore             ? `<div><span class="meta-label">Score</span><span class="meta-value" style="color:${ORANGE};font-size:11pt;">${matchInfo.ourScore || 0} – ${matchInfo.oppScore || 0}</span></div>` : ''}
  <div><span class="meta-label">Date</span><span class="meta-value">${displayDate}</span></div>
  <div><span class="meta-label">Events</span><span class="meta-value">${myEvents.length}</span></div>
  <div><span class="meta-label">Clips</span><span class="meta-value">${clips.length}</span></div>
</div>

${myPoss !== null ? `
<div class="section">
  <div class="section-head">Possession (carry-based)</div>
  <div style="display:flex;justify-content:space-between;margin-bottom:3pt;font-size:8.5pt;">
    <span style="color:${ORANGE};font-weight:800;">Us ${myPoss}%  (${myCarries} carries)</span>
    <span style="color:#A32D2D;font-weight:800;">Opp ${100-myPoss}%  (${oppCarries} carries)</span>
  </div>
  <div class="poss-bar"><div class="poss-fill" style="width:${myPoss}%;"></div></div>
</div>` : ''}

<div class="section">
  <div class="section-head">Squad Summary</div>
  <table>
    <thead><tr>
      <th>Player</th><th class="tc">Actions</th><th class="tc">Positive</th>
      <th class="tc">Negative</th><th class="tc">Involve</th>
      <th class="tc">Tackle %</th><th class="tc">Score</th>
    </tr></thead>
    <tbody>${teamSummaryRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-head">Team Totals</div>
  <div style="display:flex;flex-wrap:wrap;gap:4pt;">${teamBadgesHtml}</div>
</div>

${oppEvents.length > 0 ? `
<div class="section">
  <div class="section-head" style="border-color:#A32D2D;color:#A32D2D;">Opposition Stats</div>
  <div style="display:flex;flex-wrap:wrap;gap:4pt;">${oppBadgesHtml}</div>
</div>` : ''}

<!-- ── Per-player pages ─────────────────────────── -->
${sections.playerStats ? playerPagesHtml : ''}

<!-- ── Events log page ─────────────────────────── -->
${sections.eventsTimeline && myEvents.length > 0 ? `
<div style="page-break-before:always;padding-top:6pt;">
  <div class="section-head">Events Log</div>
  <table>
    <thead><tr><th>Time</th><th>Half</th><th>Player</th><th>Stat</th><th>Class</th><th>Metres</th></tr></thead>
    <tbody>${eventRowsHtml}</tbody>
  </table>
</div>` : ''}

<!-- ── Clips page ────────────────────────────────── -->
${clips.length > 0 ? `
<div style="page-break-before:always;padding-top:6pt;">
  <div class="section-head">Clips</div>
  <table>
    <thead><tr><th>Label</th><th>In</th><th>Out</th><th>Duration</th><th>Status</th></tr></thead>
    <tbody>${clipRowsHtml}</tbody>
  </table>
</div>` : ''}

</body>
</html>`
}
