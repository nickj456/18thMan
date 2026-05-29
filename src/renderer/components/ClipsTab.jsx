import React, { useState, useCallback } from 'react'
import { fmtTime } from '../utils/format'

const fmt = (sec) => fmtTime(sec, '--:--')

export default function ClipsTab({
  clips, addClip, updateClipStatus, deleteClip, reorderClips,
  outputFolder, setOutputFolder, showNotification, videoFile, videoRef,
}) {
  const [exportProgress, setExportProgress] = useState({})
  const [dragIdx, setDragIdx] = useState(null)
  const [reelExporting, setReelExporting] = useState(false)
  const [mergeExporting, setMergeExporting] = useState(false)

  const isVeo = !!videoFile?.veoUrl

  const playClip = (clip) => {
    const vid = videoRef?.current
    if (!vid) return
    vid.currentTime = clip.inPoint
    vid.play()
    const check = () => {
      if (vid.currentTime >= clip.outPoint) {
        vid.pause()
        vid.removeEventListener('timeupdate', check)
      }
    }
    vid.addEventListener('timeupdate', check)
  }

  const exportHighlightReel = async () => {
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    const saved = clips.filter(c => c.outputFile)
    if (saved.length === 0) { showNotification('Export your clips first, then create the reel', 'error'); return }
    setReelExporting(true)
    const ts = Date.now()
    const outputPath = `${outputFolder}\\highlight-reel-${ts}.mp4`
    const result = await window.electron?.exportHighlightReel({ clips: saved, outputPath })
    setReelExporting(false)
    if (result?.success) showNotification(`Highlight reel saved!`)
    else showNotification(result?.error || 'Reel export failed', 'error')
  }

  const mergeByPlayer = async () => {
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    const saved = clips.filter(c => c.status === 'saved' && c.playerName)
    const groups = {}
    saved.forEach(c => {
      if (!groups[c.playerName]) groups[c.playerName] = []
      groups[c.playerName].push(c)
    })
    const qualifying = Object.entries(groups).filter(([, g]) => g.length >= 2)
    if (qualifying.length === 0) {
      showNotification('Need 2+ exported clips for at least one player', 'error')
      return
    }
    setMergeExporting(true)
    let merged = 0
    for (const [playerName, playerClips] of qualifying) {
      const outputPath = `${outputFolder}\\${playerName} – All Clips.mp4`
      const result = await window.electron?.exportHighlightReel({ clips: playerClips, outputPath })
      if (result?.success) {
        addClip({ label: `${playerName} – All Clips`, status: 'saved', outputFile: outputPath, inPoint: 0, outPoint: 0 })
        merged++
      }
    }
    setMergeExporting(false)
    if (merged > 0) showNotification(`Merged clips for ${merged} player${merged > 1 ? 's' : ''}`)
    else showNotification('Merge failed', 'error')
  }

  const chooseFolder = async () => {
    const folder = await window.electron?.chooseFolder()
    if (folder) setOutputFolder(folder)
  }

  const runExport = useCallback(async (clip) => {
    if (!videoFile) { showNotification('Load a video first', 'error'); return }
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    updateClipStatus(clip.id, 'exporting')
    const unsub = window.electron?.onFfmpegProgress((data) => {
      if (data.label === clip.label)
        setExportProgress((p) => ({ ...p, [clip.id]: data.percent }))
    })
    try {
      const result = await window.electron?.exportClip({
        sourceFile: videoFile.path, inPoint: clip.inPoint,
        outPoint: clip.outPoint, label: clip.label, outputFolder,
      })
      if (result?.success) {
        updateClipStatus(clip.id, 'saved', result.outputFile)
        showNotification(`Saved: ${clip.label}.mp4`)
      } else {
        updateClipStatus(clip.id, 'error')
        showNotification(`Failed: ${result?.error}`, 'error')
      }
    } catch {
      updateClipStatus(clip.id, 'error')
      showNotification('Export failed', 'error')
    } finally {
      if (unsub) unsub()
      setExportProgress((p) => { const n = { ...p }; delete n[clip.id]; return n })
    }
  }, [videoFile, outputFolder, updateClipStatus, showNotification])

  const exportAll = async () => {
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    for (const c of clips) await runExport(c)
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: 6, padding: '7px 8px',
        borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {isVeo ? (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', padding: '4px 2px' }}>
            Streaming from Veo — export unavailable. Play clips below to review.
          </div>
        ) : (
          <>
            <button onClick={chooseFolder} style={btnStyle(false)}>
              📁 {outputFolder ? outputFolder.split(/[/\\]/).pop() : 'SET OUTPUT FOLDER'}
            </button>
            {clips.length > 0 && (
              <button onClick={exportAll} style={btnStyle(true)}>EXPORT ALL</button>
            )}
            {clips.filter(c => c.outputFile).length > 1 && (
              <button onClick={exportHighlightReel} disabled={reelExporting} style={btnStyle(false)} title="Merge all exported clips into one video">
                {reelExporting ? '…' : '🎬 REEL'}
              </button>
            )}
          {clips.filter(c => c.status === 'saved' && c.playerName).length >= 2 && (
            <button
              onClick={mergeByPlayer}
              disabled={mergeExporting}
              style={btnStyle(false)}
              title="Merge exported clips into one file per player"
            >
              {mergeExporting ? '…' : '👤 MERGE BY PLAYER'}
            </button>
          )}
          </>
        )}
      </div>

      {/* Clip list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
        {clips.length === 0 ? (
          <div style={{
            color: 'var(--muted)', fontFamily: 'var(--font-body)',
            fontSize: 12, textAlign: 'center', padding: '40px 20px', lineHeight: 1.8,
          }}>
            No clips yet. Use Mark IN / Mark OUT in the video panel to create clips.
          </div>
        ) : clips.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragIdx === null || dragIdx === i) return
              const next = [...clips]
              const [removed] = next.splice(dragIdx, 1)
              next.splice(i, 0, removed)
              reorderClips(next)
              setDragIdx(i)
            }}
            onDragEnd={() => setDragIdx(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 10px', marginBottom: 4,
              border: `1px solid ${dragIdx === i ? 'var(--brand)' : 'var(--border)'}`,
              borderRadius: 2, background: 'var(--bg)',
              opacity: dragIdx !== null && dragIdx !== i ? 0.6 : 1,
              cursor: 'grab',
            }}
          >
            <span style={{ color: 'var(--border)', fontSize: 14, cursor: 'grab', userSelect: 'none' }} title="Drag to reorder">⠿</span>
            <StatusBadge status={c.status} progress={exportProgress[c.id]} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12,
                color: 'var(--brand)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {c.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
                {fmt(c.inPoint)} → {fmt(c.outPoint)} · {fmt(c.outPoint - c.inPoint)}
              </div>
              {c.outputFile && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.outputFile}
                </div>
              )}
            </div>
            <button onClick={() => playClip(c)} style={{ ...btnStyle(false), color: 'var(--brand)', borderColor: 'var(--brand)' }} title="Play this clip">▶ PLAY</button>
            {!isVeo && <button onClick={() => runExport(c)} style={btnStyle(false)}>↺ EXPORT</button>}
            <button onClick={() => deleteClip(c.id)} style={{ ...btnStyle(false), color: 'var(--red)', borderColor: 'rgba(163,45,45,0.5)' }}>✕</button>
          </div>
        ))}
        {clips.length > 1 && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)', padding: '4px 2px' }}>
            Drag ⠿ to reorder clips for presentation
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status, progress }) {
  const map = {
    pending:   { label: 'PENDING',  color: 'var(--muted)' },
    exporting: { label: progress != null ? `${Math.round(progress)}%` : '…', color: 'var(--brand)' },
    saved:     { label: '✓ SAVED',  color: 'var(--green)' },
    error:     { label: 'ERROR',    color: 'var(--red)' },
  }
  const s = map[status] || map.pending
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', color: s.color, fontSize: 9, fontWeight: 800,
      letterSpacing: 0.6, border: `1px solid ${s.color}`,
      padding: '2px 5px', borderRadius: 2, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function btnStyle(accent) {
  return {
    background: accent ? 'var(--brand)' : 'transparent',
    color: accent ? '#fff' : 'var(--muted)',
    border: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
    padding: '4px 10px', borderRadius: 2,
    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
    letterSpacing: 0.6, textTransform: 'uppercase',
    cursor: 'pointer', whiteSpace: 'nowrap',
  }
}
