import React, { useRef, useState, useEffect, useCallback } from 'react'
import MatchClock from './MatchClock'
import { fmtTime as fmt } from '../utils/format'

const SPEEDS = [0.25, 0.5, 1, 1.5, 2]

export default function VideoPlayer({ videoRef, videoFile, setVideoFile, half, setHalf, clips, events, videoHeight }) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [veoInput, setVeoInput] = useState('')
  const [veoLoading, setVeoLoading] = useState(false)
  const [veoError, setVeoError] = useState(null)
  const [showVeoBar, setShowVeoBar] = useState(false)
  const progressRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const vid = videoRef.current
      if (!vid) return
      if (e.key === ' ') {
        e.preventDefault()
        vid.paused ? vid.play() : vid.pause()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        vid.currentTime = Math.max(0, vid.currentTime - 5)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        vid.currentTime = Math.min(vid.duration || 0, vid.currentTime + 5)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoRef])

  const handleOpenFile = async () => {
    const filePath = await window.electron?.openFile()
    if (!filePath) return
    const url = `file:///${filePath.replace(/\\/g, '/')}`
    setVideoFile({ path: filePath, url })
    setPlaying(false)
    setCurrentTime(0)
  }

  const handleLoadVeo = async () => {
    if (!veoInput.trim()) return
    setVeoLoading(true)
    setVeoError(null)
    const result = await window.electron?.resolveVeoVideo(veoInput.trim())
    setVeoLoading(false)
    if (result?.error) { setVeoError(result.error); return }
    setVideoFile({ path: null, url: result.url, veoUrl: result.veoUrl })
    setVeoInput('')
    setShowVeoBar(false)
    setPlaying(false)
    setCurrentTime(0)
  }

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !videoFile) return
    vid.src = videoFile.url
    vid.load()
  }, [videoFile])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onTime = () => { if (!dragging) setCurrentTime(vid.currentTime) }
    const onDur = () => setDuration(vid.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    vid.addEventListener('timeupdate', onTime)
    vid.addEventListener('loadedmetadata', onDur)
    vid.addEventListener('play', onPlay)
    vid.addEventListener('pause', onPause)
    return () => {
      vid.removeEventListener('timeupdate', onTime)
      vid.removeEventListener('loadedmetadata', onDur)
      vid.removeEventListener('play', onPlay)
      vid.removeEventListener('pause', onPause)
    }
  }, [dragging])

  const togglePlay = () => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) vid.play()
    else vid.pause()
  }

  const skip = (secs) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.duration || 0, vid.currentTime + secs))
  }

  const setPlaybackSpeed = (s) => {
    setSpeed(s)
    if (videoRef.current) videoRef.current.playbackRate = s
  }

  const seekTo = useCallback((e) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect || !duration) return
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = pct * duration
    if (videoRef.current) videoRef.current.currentTime = t
    setCurrentTime(t)
  }, [duration])

  const onProgressMouseDown = (e) => {
    setDragging(true)
    seekTo(e)
    const onMove = (ev) => seekTo(ev)
    const onUp = () => {
      setDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const pct = duration ? (currentTime / duration) * 100 : 0

  const clipMarkers = clips.map((c) => ({
    left: duration ? (c.inPoint / duration) * 100 : 0,
    width: duration ? ((c.outPoint - c.inPoint) / duration) * 100 : 0,
    id: c.id,
  }))

  const eventDots = events.map((ev) => ({
    id: ev.id,
    left: duration ? (ev.timestamp / duration) * 100 : 0,
    color: ev.color,
  }))

  return (
    <div style={{ background: 'var(--panel-2)', flexShrink: 0 }}>
      {/* Video element */}
      <div style={{ position: 'relative', background: '#000', height: videoHeight, overflow: 'hidden' }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
          preload="metadata"
          onClick={togglePlay}
        />
        {!videoFile && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32,
          }}>
            {/* Local file */}
            <div onClick={handleOpenFile} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '2px solid var(--border-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--muted)', fontSize: 20,
              }}>▶</div>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>
                Load File
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)' }}>
                MP4 · MKV · MOV · AVI
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 60, background: 'var(--border)' }} />

            {/* Veo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--brand)', textTransform: 'uppercase' }}>
                Stream from Veo
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  value={veoInput}
                  onChange={e => { setVeoInput(e.target.value); setVeoError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleLoadVeo()}
                  placeholder="https://app.veo.co/matches/..."
                  style={{
                    width: 220, background: 'var(--panel)', color: 'var(--text)',
                    border: `1px solid ${veoError ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10,
                    padding: '5px 8px',
                  }}
                />
                <button
                  onClick={handleLoadVeo}
                  disabled={veoLoading || !veoInput.trim()}
                  style={{
                    background: 'var(--brand)', color: '#fff', border: 'none',
                    padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                    fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
                    opacity: !veoInput.trim() ? 0.4 : 1,
                  }}
                >
                  {veoLoading ? '…' : 'LOAD'}
                </button>
              </div>
              {veoError && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)' }}>{veoError}</div>
              )}
              {!veoError && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)' }}>
                  No download — streams directly
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        ref={progressRef}
        onMouseDown={onProgressMouseDown}
        style={{
          position: 'relative', height: 18, background: '#050608',
          cursor: 'pointer', borderTop: '1px solid var(--border)',
        }}
      >
        {/* Clip segments */}
        {clipMarkers.map((m) => (
          <div key={m.id} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${m.left}%`, width: `${m.width}%`,
            background: 'rgba(232,86,10,0.22)',
            borderLeft: '1px solid rgba(232,86,10,0.7)',
            borderRight: '1px solid rgba(232,86,10,0.7)',
          }} />
        ))}
        {/* Event dots */}
        {eventDots.map((d) => (
          <div key={d.id} style={{
            position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
            left: `${d.left}%`, width: 5, height: 5, borderRadius: '50%',
            background: d.color, border: '1px solid rgba(255,255,255,0.25)',
          }} />
        ))}
        {/* Fill */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`,
          background: 'rgba(232,86,10,0.14)', pointerEvents: 'none',
        }} />
        {/* Playhead */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: `${pct}%`,
          width: 2, background: 'var(--brand)', transform: 'translateX(-50%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Veo URL input bar */}
      {showVeoBar && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--brand)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Veo URL</span>
          <input
            autoFocus
            type="text"
            value={veoInput}
            onChange={e => { setVeoInput(e.target.value); setVeoError(null) }}
            onKeyDown={e => { if (e.key === 'Enter') handleLoadVeo(); if (e.key === 'Escape') setShowVeoBar(false) }}
            placeholder="https://app.veo.co/matches/..."
            style={{
              flex: 1, background: 'var(--bg)', color: 'var(--text)',
              border: `1px solid ${veoError ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 2, fontFamily: 'var(--font-mono)', fontSize: 10, padding: '4px 8px',
            }}
          />
          {veoError && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--red)', whiteSpace: 'nowrap' }}>{veoError}</span>}
          <button
            onClick={handleLoadVeo}
            disabled={veoLoading || !veoInput.trim()}
            style={{
              background: 'var(--brand)', color: '#fff', border: 'none',
              padding: '4px 10px', borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 800,
              opacity: !veoInput.trim() ? 0.4 : 1,
            }}
          >{veoLoading ? '…' : 'LOAD'}</button>
          <button onClick={() => setShowVeoBar(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Controls bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', flexWrap: 'wrap', rowGap: 3,
        borderBottom: '1px solid var(--border)',
      }}>
        <CtrlBtn onClick={handleOpenFile} title="Open local video file">📂</CtrlBtn>
        <CtrlBtn onClick={() => setShowVeoBar(v => !v)} title="Stream from Veo" style={{ color: 'var(--brand)', borderColor: 'var(--brand)' }}>
          {veoLoading ? '…' : 'VEO'}
        </CtrlBtn>
        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
        <CtrlBtn onClick={() => skip(-10)}>−10s</CtrlBtn>
        <CtrlBtn onClick={() => skip(-2)}>−2s</CtrlBtn>
        <CtrlBtn onClick={togglePlay} accent style={{ minWidth: 36 }}>
          {playing ? '⏸' : '▶'}
        </CtrlBtn>
        <CtrlBtn onClick={() => skip(2)}>+2s</CtrlBtn>
        <CtrlBtn onClick={() => skip(10)}>+10s</CtrlBtn>

        <span style={{
          fontFamily: 'var(--font-mono)', color: 'var(--brand)',
          fontSize: 12, minWidth: 96, textAlign: 'center',
        }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>

        {/* Speed */}
        <div style={{ display: 'flex', gap: 2 }}>
          {SPEEDS.map((s) => (
            <button key={s} onClick={() => setPlaybackSpeed(s)} style={{
              background: speed === s ? 'var(--brand)' : 'transparent',
              color: speed === s ? '#fff' : 'var(--muted)',
              border: `1px solid ${speed === s ? 'var(--brand)' : 'var(--border)'}`,
              padding: '2px 5px', borderRadius: 2, fontSize: 10,
              cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700,
            }}>{s}×</button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Half indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase' }}>HALF</span>
          <button onClick={() => {
            const newHalf = half === 1 ? 2 : 1
            if (events.length > 0 && !window.confirm(`Switch to ${newHalf === 1 ? '1st' : '2nd'} half? New events will be logged under half ${newHalf}.`)) return
            setHalf(newHalf)
          }} style={{
            background: 'var(--brand)', color: '#fff',
            border: 'none', padding: '3px 10px', borderRadius: 2,
            fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
            letterSpacing: 0.5, cursor: 'pointer',
          }}>
            {half === 1 ? '1ST' : '2ND'}
          </button>
        </div>

        <MatchClock />
      </div>
    </div>
  )
}

function CtrlBtn({ onClick, children, accent, style, title }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: accent ? 'var(--brand)' : 'transparent',
      color: accent ? '#fff' : 'var(--text)',
      border: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
      padding: '3px 7px', borderRadius: 2, fontSize: 11,
      cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700,
      letterSpacing: 0.3, ...style,
    }}>
      {children}
    </button>
  )
}
