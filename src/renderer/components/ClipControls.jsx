import React, { useState, useCallback } from 'react'
import { fmtTime } from '../utils/format'

const fmt = (sec) => fmtTime(sec, '--:--')

export default function ClipControls({
  videoRef, videoFile, clips, addClip, updateClipStatus, deleteClip,
  outputFolder, setOutputFolder, showNotification,
}) {
  const [inPoint, setInPoint] = useState(null)
  const [label, setLabel] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState({})

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

  const markIn = () => {
    const t = videoRef.current?.currentTime
    if (t == null) return
    setInPoint(t)
  }

  const chooseFolder = async () => {
    const folder = await window.electron?.chooseFolder()
    if (folder) setOutputFolder(folder)
  }

  const runExport = useCallback(async (clip, folder) => {
    if (!videoFile) return
    const target = folder || outputFolder
    if (!target) { showNotification('Select an output folder first', 'error'); return }
    updateClipStatus(clip.id, 'exporting')
    const unsub = window.electron?.onFfmpegProgress((data) => {
      if (data.label === clip.label)
        setExportProgress((p) => ({ ...p, [clip.id]: data.percent }))
    })
    try {
      const result = await window.electron?.exportClip({
        sourceFile: videoFile.path, inPoint: clip.inPoint,
        outPoint: clip.outPoint, label: clip.label, outputFolder: target,
      })
      if (result?.success) {
        updateClipStatus(clip.id, 'saved', result.outputFile)
        showNotification(`Clip saved: ${clip.label}.mp4`)
      } else {
        updateClipStatus(clip.id, 'error')
        showNotification(`Export failed: ${result?.error || 'unknown'}`, 'error')
      }
    } catch {
      updateClipStatus(clip.id, 'error')
      showNotification('Export failed', 'error')
    } finally {
      if (unsub) unsub()
      setExportProgress((p) => { const n = { ...p }; delete n[clip.id]; return n })
    }
  }, [videoFile, outputFolder, updateClipStatus, showNotification])

  const markOutAndExport = async () => {
    const outPoint = videoRef.current?.currentTime
    if (inPoint == null || outPoint == null) { showNotification('Mark IN first', 'error'); return }
    if (outPoint <= inPoint) { showNotification('OUT must be after IN', 'error'); return }
    const clipLabel = label.trim() || `clip-${fmt(inPoint).replace(':', '')}`
    const clip = { inPoint, outPoint, label: clipLabel, id: Date.now(), status: 'pending' }
    addClip(clip)
    setInPoint(null)
    setLabel('')
    if (isVeo) { showNotification(`Clip marked: ${clipLabel}`); return }
    if (!outputFolder) {
      const folder = await window.electron?.chooseFolder()
      if (!folder) return
      setOutputFolder(folder)
    }
    runExport(clip, outputFolder)
  }

  const exportAll = async () => {
    const pending = clips.filter((c) => c.status !== 'saved')
    if (pending.length === 0) { showNotification('No clips to export'); return }
    if (!outputFolder) { showNotification('Select an output folder first', 'error'); return }
    setExporting(true)
    for (const c of pending) await runExport(c, outputFolder)
    setExporting(false)
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel)', padding: '7px 10px', flexShrink: 0 }}>
      {/* Clip capture row */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: clips.length ? 6 : 0 }}>
        <Btn onClick={markIn} accent>
          {inPoint != null ? `IN ${fmt(inPoint)}` : 'MARK IN'}
        </Btn>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Clip label..."
          style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)' }}
          onKeyDown={(e) => { if (e.key === 'Enter') markOutAndExport() }}
        />
        <Btn onClick={markOutAndExport} disabled={inPoint == null || isVeo} title={isVeo ? 'Export unavailable when streaming from Veo' : undefined}>
          {isVeo ? 'MARK OUT (NO EXPORT)' : 'MARK OUT + EXPORT'}
        </Btn>
        <Btn onClick={chooseFolder} title="Choose output folder">
          📁 {outputFolder ? '✓' : 'FOLDER'}
        </Btn>
        {clips.length > 0 && (
          <Btn onClick={exportAll} disabled={exporting}>
            {exporting ? 'EXPORTING…' : 'ALL'}
          </Btn>
        )}
      </div>

      {/* Clips mini-list */}
      {clips.length > 0 && (
        <div style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {clips.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 6px', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 2, fontSize: 11,
            }}>
              <StatusBadge status={c.status} progress={exportProgress[c.id]} />
              <span style={{
                fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--brand)',
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 11,
              }}>
                {c.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 10 }}>
                {fmt(c.inPoint)} → {fmt(c.outPoint)}
              </span>
              <Btn onClick={() => playClip(c)} style={{ padding: '1px 6px', fontSize: 10, color: 'var(--brand)', borderColor: 'var(--brand)' }} title="Play clip">▶</Btn>
              {!isVeo && <Btn onClick={() => runExport(c)} style={{ padding: '1px 6px', fontSize: 10 }}>↺</Btn>}
              <Btn onClick={() => deleteClip(c.id)} style={{ padding: '1px 6px', fontSize: 10, color: 'var(--red)', borderColor: 'var(--red)' }}>✕</Btn>
            </div>
          ))}
        </div>
      )}
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
      padding: '1px 4px', borderRadius: 2, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function Btn({ onClick, children, accent, disabled, style, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={{
      background: accent ? 'var(--brand)' : 'transparent',
      color: accent ? '#fff' : disabled ? 'var(--muted-2)' : 'var(--text)',
      border: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
      padding: '3px 8px', borderRadius: 2,
      fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
      letterSpacing: 0.6, textTransform: 'uppercase',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </button>
  )
}
