import React, { useState, useMemo } from 'react'
import { fmtTime as fmt } from '../utils/format'

const ALL_STAT_TYPES = [
  { key: 'try',           label: 'Try',          color: 'var(--green)' },
  { key: 'tackle',        label: 'Tackle',        color: 'var(--blue)' },
  { key: 'missed_tackle', label: 'Missed tackle', color: 'var(--red)' },
  { key: 'carry',         label: 'Carry',         color: 'var(--amber)' },
  { key: 'line_break',    label: 'Line break',    color: 'var(--purple)' },
  { key: 'support',       label: 'Support',       color: 'var(--teal)' },
  { key: 'offload',       label: 'Offload',       color: 'var(--teal)' },
  { key: 'kick',          label: 'Kick',          color: 'var(--dark-red)' },
  { key: 'penalty_won',   label: 'Penalty won',   color: 'var(--green)' },
  { key: 'penalty_con',   label: 'Penalty con',   color: 'var(--orange)' },
  { key: 'error',         label: 'Error',         color: 'var(--red)' },
  { key: 'intercept',     label: 'Intercept',     color: 'var(--purple)' },
]

export default function ClipBuilder({ players, events, addClip, videoRef, showNotification, outputFolder, videoFile, updateClipStatus }) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set((players ?? []).filter(p => !p.isOpposition).map(p => p.id)))
  const [selectedStatKeys, setSelectedStatKeys]   = useState(() => new Set(ALL_STAT_TYPES.map(s => s.key)))
  const [bufferBefore, setBufferBefore]           = useState(5)
  const [bufferAfter, setBufferAfter]             = useState(8)
  const [uncheckedEventIds, setUncheckedEventIds] = useState(() => new Set())
  const [mergeAfterExport, setMergeAfterExport] = useState(false)
  const [merging, setMerging] = useState(false)

  const usedStatKeys = useMemo(() => new Set((events ?? []).map(ev => ev.statKey)), [events])

  const matchedEvents = useMemo(() => (events ?? []).filter(ev =>
    selectedPlayerIds.has(ev.playerId) && selectedStatKeys.has(ev.statKey)
  ), [events, selectedPlayerIds, selectedStatKeys])

  const selectedEvents = useMemo(
    () => matchedEvents.filter(ev => !uncheckedEventIds.has(ev.id)),
    [matchedEvents, uncheckedEventIds]
  )

  const togglePlayer = (id) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setUncheckedEventIds(new Set())
  }

  const ownPlayers = (players ?? []).filter(p => !p.isOpposition)
  const allPlayersSelected = ownPlayers.length > 0 && ownPlayers.every(p => selectedPlayerIds.has(p.id))
  const toggleAllPlayers = () => {
    setSelectedPlayerIds(allPlayersSelected ? new Set() : new Set((players ?? []).filter(p => !p.isOpposition).map(p => p.id)))
    setUncheckedEventIds(new Set())
  }

  const toggleStat = (key) => {
    setSelectedStatKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setUncheckedEventIds(new Set())
  }

  const allStatsSelected = ALL_STAT_TYPES.every(s => selectedStatKeys.has(s.key))
  const toggleAllStats = () => {
    setSelectedStatKeys(allStatsSelected ? new Set() : new Set(ALL_STAT_TYPES.map(s => s.key)))
    setUncheckedEventIds(new Set())
  }

  const toggleEventCheck = (id) => {
    setUncheckedEventIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreateClips = async () => {
    if (!selectedEvents.length) return
    const duration = videoRef?.current?.duration

    const newClips = []
    selectedEvents.forEach((ev, i) => {
      const inPoint  = Math.max(0, ev.timestamp - bufferBefore)
      const outPoint = duration ? Math.min(duration, ev.timestamp + bufferAfter) : ev.timestamp + bufferAfter
      if (outPoint > inPoint) {
        newClips.push({
          id: Date.now() + i,
          inPoint,
          outPoint,
          label: `${ev.statLabel} – ${ev.playerName} ${fmt(ev.timestamp)}`,
          playerName: ev.playerName,
        })
      }
    })
    if (!newClips.length) return

    newClips.forEach(clip => addClip?.({ id: clip.id, inPoint: clip.inPoint, outPoint: clip.outPoint, label: clip.label, playerName: clip.playerName }))

    if (!mergeAfterExport) {
      showNotification?.(`${newClips.length} clips created — go to Clips tab to export`)
      return
    }

    if (!outputFolder || !videoFile?.path) {
      showNotification?.('Select an output folder first to use merge', 'error')
      return
    }

    setMerging(true)

    const exportedClips = []
    for (const clip of newClips) {
      const result = await window.electron?.exportClip({
        sourceFile: videoFile.path,
        inPoint: clip.inPoint,
        outPoint: clip.outPoint,
        label: clip.label,
        outputFolder,
      })
      if (result?.success) {
        updateClipStatus?.(clip.id, 'saved', result.outputFile)
        exportedClips.push({ ...clip, outputFile: result.outputFile })
      } else {
        updateClipStatus?.(clip.id, 'error')
      }
    }

    const groups = {}
    exportedClips.forEach(c => {
      if (!groups[c.playerName]) groups[c.playerName] = []
      groups[c.playerName].push(c)
    })

    let merged = 0
    for (const [playerName, playerClips] of Object.entries(groups)) {
      if (playerClips.length < 2) continue
      const outputPath = `${outputFolder}\\${playerName} – All Clips.mp4`
      const result = await window.electron?.exportHighlightReel({ clips: playerClips, outputPath })
      if (result?.success) {
        addClip?.({ label: `${playerName} – All Clips`, status: 'saved', outputFile: outputPath, inPoint: 0, outPoint: 0 })
        merged++
      }
    }

    setMerging(false)
    showNotification?.(`${exportedClips.length} clips exported${merged > 0 ? ` · merged for ${merged} player${merged > 1 ? 's' : ''}` : ''}`)
  }

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Left column: criteria ─────────────────────────────────── */}
      <div style={{ width: 195, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Buffer inputs */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2, marginBottom: 6 }}>BUFFER (SECONDS)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>Before</span>
            <input type="number" value={bufferBefore} min={1} max={30} onChange={e => setBufferBefore(Math.min(30, Math.max(1, Number(e.target.value))))}
              style={{ width: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>After</span>
            <input type="number" value={bufferAfter} min={1} max={30} onChange={e => setBufferAfter(Math.min(30, Math.max(1, Number(e.target.value))))}
              style={{ width: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          </div>
        </div>

        {/* Merge toggle */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={mergeAfterExport}
              onChange={e => setMergeAfterExport(e.target.checked)}
              disabled={!outputFolder || !videoFile?.path}
            />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, color: mergeAfterExport ? 'var(--brand)' : 'var(--muted)', lineHeight: 1.3 }}>
              Merge clips by player after export
            </span>
          </label>
          {mergeAfterExport && (!outputFolder || !videoFile?.path) && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', marginTop: 4 }}>
              Requires video + output folder
            </div>
          )}
        </div>

        {/* Players */}
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>PLAYERS</span>
            <button onClick={toggleAllPlayers} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {allPlayersSelected ? 'None' : 'All'}
            </button>
          </div>
          {(players ?? []).filter(p => !p.isOpposition).map(p => (
            <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedPlayerIds.has(p.id)} onChange={() => togglePlayer(p.id)} />
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11 }}>
                <span style={{ fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', marginRight: 4 }}>#{p.number}</span>
                {p.name}
              </span>
            </label>
          ))}
        </div>

        {/* Event Types */}
        <div style={{ padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>EVENT TYPES</span>
            <button onClick={toggleAllStats} style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {allStatsSelected ? 'None' : 'All'}
            </button>
          </div>
          {ALL_STAT_TYPES.map(s => {
            const hasEvents = usedStatKeys.has(s.key)
            return (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: hasEvents ? 'pointer' : 'default', opacity: hasEvents ? 1 : 0.4 }}>
                <input type="checkbox" checked={selectedStatKeys.has(s.key)} disabled={!hasEvents} onChange={() => hasEvents && toggleStat(s.key)} />
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11, color: s.color, fontWeight: 700 }}>{s.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* ── Right column: preview ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
            {matchedEvents.length} matched,&nbsp;
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{selectedEvents.length} selected</span>
          </span>
        </div>

        {/* Event list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {matchedEvents.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 12, textAlign: 'center', padding: '40px 24px', lineHeight: 1.8 }}>
              {events.length === 0 ? 'No events logged yet.' : 'No events match the selected criteria.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 1 }}>
                  {['', 'TIME', 'H', 'PLAYER', 'STAT'].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '5px 8px', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 800, color: 'var(--muted)', letterSpacing: 1.2 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchedEvents.map(ev => {
                  const checked = !uncheckedEventIds.has(ev.id)
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid var(--border)', opacity: checked ? 1 : 0.4 }}>
                      <td style={{ padding: '4px 8px' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEventCheck(ev.id)} />
                      </td>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>
                        {fmt(ev.timestamp)}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
                        {ev.half}
                      </td>
                      <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', color: 'var(--brand)', fontSize: 12 }}>#{ev.playerNumber}</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, marginLeft: 4 }}>{ev.playerName}</span>
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: ev.color, border: `1px solid ${ev.color}50`, padding: '2px 7px', borderRadius: 2, background: `${ev.color}14`, whiteSpace: 'nowrap' }}>
                          {ev.statLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Create button */}
        <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0 }}>
          <button
            onClick={handleCreateClips}
            disabled={selectedEvents.length === 0 || merging}
            style={{
              width: '100%', fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              background: selectedEvents.length > 0 && !merging ? 'var(--brand)' : 'var(--border)',
              color: selectedEvents.length > 0 && !merging ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: 2, padding: '7px 0',
              cursor: selectedEvents.length > 0 && !merging ? 'pointer' : 'default',
              letterSpacing: 0.5,
            }}
          >
            {merging
              ? 'EXPORTING…'
              : mergeAfterExport
                ? `✂️ CREATE ${selectedEvents.length} CLIPS + MERGE BY PLAYER`
                : `✂️ CREATE ${selectedEvents.length} CLIPS`}
          </button>
        </div>
      </div>

    </div>
  )
}
