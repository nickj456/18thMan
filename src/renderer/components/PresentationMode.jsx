import React, { useState, useEffect, useRef, useCallback } from 'react'
import { STAT_COLORS } from '../utils/stats'
import { fmtTime as fmt } from '../utils/format'

const DRAW_COLORS = [
  { hex:'#ffffff', label:'White' },
  { hex:'#facc15', label:'Yellow' },
  { hex:'#f97316', label:'Orange' },
  { hex:'#ef4444', label:'Red' },
  { hex:'#22c55e', label:'Green' },
  { hex:'#60a5fa', label:'Blue' },
]

const SPEEDS = [0.25, 0.5, 0.75, 1]

function getClipPlayer(clip, events, players) {
  if (!clip) return null
  const inRange = events.filter(e => e.timestamp >= clip.inPoint - 2 && e.timestamp <= clip.outPoint + 2)
  if (!inRange.length) return null
  const counts = {}
  inRange.forEach(e => { counts[e.playerId] = (counts[e.playerId] || 0) + 1 })
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  return players.find(p => String(p.id) === String(topId)) || null
}

export default function PresentationMode({ videoFile, events, players, clips, matchInfo, onExit }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const listRef    = useRef(null)
  const lastPos    = useRef(null)

  const [clipIndex, setClipIndex]       = useState(0)
  const [playing, setPlaying]           = useState(false)
  const [currentTime, setCurrentTime]   = useState(0)
  const [duration, setDuration]         = useState(0)
  const [muted, setMuted]               = useState(false)
  const [speed, setSpeed]               = useState(1)

  // Annotation tools
  const [tool, setTool]                 = useState(null) // 'draw' | 'spotlight' | null
  const [drawing, setDrawing]           = useState(false)
  const [drawColor, setDrawColor]       = useState('#facc15')
  const [lineWidth, setLineWidth]       = useState(3)
  const [spotPos, setSpotPos]           = useState({ x: 0, y: 0 })
  const [spotRadius, setSpotRadius]     = useState(140)

  const orderedClips  = clips.filter(c => c.inPoint != null)
  const currentClip   = orderedClips[clipIndex] || null
  const currentPlayer = getClipPlayer(currentClip, events, players.filter(p => !p.isOpposition))

  // ── Video loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !videoFile) return
    vid.src = videoFile.url
    vid.load()
    const onMeta = () => setDuration(vid.duration)
    vid.addEventListener('loadedmetadata', onMeta)
    return () => vid.removeEventListener('loadedmetadata', onMeta)
  }, [videoFile])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onTime  = () => setCurrentTime(vid.currentTime)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    vid.addEventListener('timeupdate', onTime)
    vid.addEventListener('play',  onPlay)
    vid.addEventListener('pause', onPause)
    return () => {
      vid.removeEventListener('timeupdate', onTime)
      vid.removeEventListener('play',  onPlay)
      vid.removeEventListener('pause', onPause)
    }
  }, [])

  // ── Canvas size sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const fit = () => {
      const c = canvasRef.current
      if (!c) return
      c.width  = c.offsetWidth
      c.height = c.offsetHeight
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // ── Navigate to clip ───────────────────────────────────────────────────────
  const goTo = useCallback((idx) => {
    if (idx < 0 || idx >= orderedClips.length) return
    setClipIndex(idx)
    clearCanvas()
    const el = listRef.current?.children[idx]
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [orderedClips.length])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid || !currentClip) return
    vid.currentTime = currentClip.inPoint
    vid.play().catch(() => {})
  }, [clipIndex, currentClip?.id])

  // Auto-advance at clip end
  useEffect(() => {
    if (!currentClip || !playing) return
    if (currentTime >= currentClip.outPoint) {
      videoRef.current?.pause()
      if (clipIndex < orderedClips.length - 1) {
        setTimeout(() => goTo(clipIndex + 1), 700)
      }
    }
  }, [currentTime, currentClip, playing, clipIndex, orderedClips.length, goTo])

  // ── Playback helpers ───────────────────────────────────────────────────────
  const togglePlay = () => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) vid.play()
    else vid.pause()
  }

  const toggleMute = () => {
    const vid = videoRef.current
    if (!vid) return
    vid.muted = !vid.muted
    setMuted(vid.muted)
  }

  const setPlaybackSpeed = (s) => {
    const vid = videoRef.current
    if (vid) vid.playbackRate = s
    setSpeed(s)
  }

  const skip = (secs) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.currentTime + secs, vid.duration || 0))
  }

  // ── Canvas drawing ─────────────────────────────────────────────────────────
  const clearCanvas = () => {
    const c = canvasRef.current
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  const getCanvasPos = (e) => {
    const c = canvasRef.current
    const rect = c.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const onMouseDown = (e) => {
    if (tool === 'draw') {
      setDrawing(true)
      lastPos.current = getCanvasPos(e)
    }
  }

  const onMouseMove = (e) => {
    if (tool === 'spotlight') {
      const c = canvasRef.current
      if (!c) return
      const rect = c.getBoundingClientRect()
      setSpotPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      return
    }
    if (tool === 'draw' && drawing) {
      const pos = getCanvasPos(e)
      const c   = canvasRef.current
      const ctx = c.getContext('2d')
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = drawColor
      ctx.lineWidth   = lineWidth
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.globalCompositeOperation = 'source-over'
      ctx.stroke()
      lastPos.current = pos
    }
  }

  const onMouseUp = () => { setDrawing(false); lastPos.current = null }

  // Scroll to resize spotlight
  const onWheel = (e) => {
    if (tool !== 'spotlight') return
    e.preventDefault()
    setSpotRadius(r => Math.max(40, Math.min(r - e.deltaY * 0.5, 500)))
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  goTo(clipIndex + 1)
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    goTo(clipIndex - 1)
      if (e.key === ' ')  { e.preventDefault(); togglePlay() }
      if (e.key === 'm')  toggleMute()
      if (e.key === 'd')  setTool(t => t === 'draw'      ? null : 'draw')
      if (e.key === 's')  setTool(t => t === 'spotlight' ? null : 'spotlight')
      if (e.key === 'c')  clearCanvas()
      if (e.key === 'Escape') {
        if (tool) setTool(null)
        else onExit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clipIndex, goTo, onExit, tool])

  // Full-screen
  useEffect(() => {
    window.electron?.setFullScreen(true)
    return () => window.electron?.setFullScreen(false)
  }, [])

  const pct = duration && currentClip
    ? Math.max(0, Math.min(100, ((currentTime - currentClip.inPoint) / (currentClip.outPoint - currentClip.inPoint)) * 100))
    : 0

  const playerEvents = currentPlayer ? events.filter(e => e.playerId === currentPlayer.id) : []
  const statCounts   = {}
  playerEvents.forEach(e => { statCounts[e.statKey] = (statCounts[e.statKey] || 0) + 1 })

  // Spotlight gradient style
  const spotGradient = tool === 'spotlight'
    ? `radial-gradient(circle ${spotRadius}px at ${spotPos.x}px ${spotPos.y}px, transparent 0%, transparent ${spotRadius * 0.75}px, rgba(0,0,0,0.82) ${spotRadius}px)`
    : null

  const cursorStyle = tool === 'draw' ? 'crosshair' : tool === 'spotlight' ? 'none' : 'default'

  return (
    <div style={{
      position:'fixed', inset:0, background:'#000',
      display:'flex', flexDirection:'column',
      zIndex:10000, fontFamily:'var(--font-ui)',
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:14, padding:'0 16px', height:44,
        background:'rgba(7,8,13,0.97)', borderBottom:'1px solid var(--border)', flexShrink:0,
      }}>
        <button onClick={onExit} style={topBtnStyle(false)}>← Exit</button>
        <div style={{ fontWeight:800, fontStyle:'italic', fontSize:14, color:'var(--brand)' }}>18thMan</div>
        {(matchInfo.club || matchInfo.opposition) && (
          <div style={{ fontSize:12, color:'var(--text)', fontWeight:600 }}>
            {matchInfo.club}{matchInfo.opposition ? ` vs ${matchInfo.opposition}` : ''}
            {matchInfo.ourScore != null && matchInfo.ourScore !== '' && matchInfo.oppScore != null && matchInfo.oppScore !== '' ? (
              <span style={{ color:'var(--brand)', marginLeft:10 }}>{matchInfo.ourScore} – {matchInfo.oppScore}</span>
            ) : null}
          </div>
        )}
        <div style={{ flex:1 }} />
        {currentClip && (
          <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'var(--font-mono)' }}>
            {clipIndex+1} / {orderedClips.length}
          </div>
        )}
      </div>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Left — video + tools */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#000' }}>

          {/* Video container with canvas + spotlight overlays */}
          <div
            style={{ flex:1, position:'relative', background:'#000', overflow:'hidden', cursor:cursorStyle }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onWheel={onWheel}
          >
            <video
              ref={videoRef}
              style={{ width:'100%', height:'100%', objectFit:'contain', display:'block', pointerEvents:'none' }}
              preload="metadata"
            />

            {/* Drawing canvas */}
            <canvas
              ref={canvasRef}
              style={{
                position:'absolute', inset:0, width:'100%', height:'100%',
                pointerEvents: tool ? 'auto' : 'none',
                zIndex:2,
              }}
            />

            {/* Spotlight overlay */}
            {tool === 'spotlight' && (
              <div style={{
                position:'absolute', inset:0, zIndex:3, pointerEvents:'none',
                background:spotGradient,
              }} />
            )}

            {/* Clip title */}
            {currentClip && (
              <div style={{
                position:'absolute', bottom:0, left:0, right:0, zIndex:4, pointerEvents:'none',
                background:'linear-gradient(transparent,rgba(0,0,0,0.85))',
                padding:'28px 18px 12px',
              }}>
                <div style={{ fontWeight:800, fontStyle:'italic', fontSize:19, color:'#fff', letterSpacing:0.3 }}>
                  {currentClip.label}
                </div>
                {currentPlayer && (
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2 }}>
                    #{currentPlayer.number} {currentPlayer.name}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clip progress */}
          <div style={{ height:4, background:'#111', flexShrink:0 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', transition:'width 0.1s' }} />
          </div>

          {/* ── Annotation toolbar ────────────────────────────────────────── */}
          <div style={{
            display:'flex', alignItems:'center', gap:10, padding:'7px 14px',
            background:'#0a0d12', borderTop:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap',
          }}>
            {/* Draw tool */}
            <ToolBtn active={tool === 'draw'} onClick={() => setTool(t => t === 'draw' ? null : 'draw')} title="Draw (D)">
              ✏️ Draw
            </ToolBtn>

            {/* Draw sub-tools (shown when draw active) */}
            {tool === 'draw' && (
              <>
                <div style={{ display:'flex', gap:4 }}>
                  {DRAW_COLORS.map(col => (
                    <button
                      key={col.hex}
                      onClick={() => setDrawColor(col.hex)}
                      title={col.label}
                      style={{
                        width:20, height:20, borderRadius:'50%',
                        background:col.hex, border:`2px solid ${drawColor === col.hex ? '#fff' : 'transparent'}`,
                        cursor:'pointer', flexShrink:0,
                      }}
                    />
                  ))}
                </div>
                <select
                  value={lineWidth}
                  onChange={e => setLineWidth(Number(e.target.value))}
                  style={{ background:'var(--bg)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:2, padding:'2px 4px', fontSize:11, fontFamily:'var(--font-ui)' }}
                >
                  <option value={2}>Thin</option>
                  <option value={4}>Medium</option>
                  <option value={8}>Thick</option>
                </select>
                <ToolBtn onClick={clearCanvas} title="Clear drawings (C)">🗑 Clear</ToolBtn>
              </>
            )}

            <div style={{ width:1, height:20, background:'var(--border)' }} />

            {/* Spotlight tool */}
            <ToolBtn active={tool === 'spotlight'} onClick={() => setTool(t => t === 'spotlight' ? null : 'spotlight')} title="Spotlight (S) — scroll to resize">
              💡 Spotlight
            </ToolBtn>

            <div style={{ flex:1 }} />

            {/* Mute */}
            <ToolBtn active={muted} onClick={toggleMute} title="Mute (M)">
              {muted ? '🔇' : '🔊'}
            </ToolBtn>

            {/* Speed */}
            <div style={{ display:'flex', gap:2 }}>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => setPlaybackSpeed(s)}
                  style={{
                    background: speed === s ? 'var(--brand)' : 'transparent',
                    color: speed === s ? '#fff' : 'var(--muted)',
                    border:`1px solid ${speed === s ? 'var(--brand)' : 'var(--border)'}`,
                    padding:'3px 7px', borderRadius:2,
                    fontFamily:'var(--font-ui)', fontSize:10, fontWeight:700, cursor:'pointer',
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* ── Playback controls ─────────────────────────────────────────── */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            padding:'10px 20px', background:'var(--panel)', flexShrink:0, flexWrap:'wrap',
          }}>
            {/* Clip navigation */}
            <NavBtn onClick={() => goTo(clipIndex - 1)} disabled={clipIndex === 0} title="Previous clip (←)">◀ Clip</NavBtn>

            {/* Skip + play cluster */}
            <SkipBtn onClick={() => skip(-10)}>−10s</SkipBtn>
            <SkipBtn onClick={() => skip(-2)}>−2s</SkipBtn>
            <PlayBtn onClick={togglePlay}>{playing ? '⏸' : '▶'}</PlayBtn>
            <SkipBtn onClick={() => skip(2)}>+2s</SkipBtn>
            <SkipBtn onClick={() => skip(10)}>+10s</SkipBtn>

            {/* Clip navigation */}
            <NavBtn onClick={() => goTo(clipIndex + 1)} disabled={clipIndex >= orderedClips.length - 1} title="Next clip (→)">Clip ▶</NavBtn>

            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--muted)', marginLeft:6 }}>
              {fmt(currentTime)}
            </div>
            <div style={{ flex:'1 1 100%', textAlign:'center', fontFamily:'var(--font-mono)', fontSize:9, color:'var(--muted-2)', marginTop:2 }}>
              Space=play · ← →=clips · D=draw · S=spotlight · M=mute · Esc=exit
            </div>
          </div>
        </div>

        {/* ── Right sidebar: clip list + player card ─────────────────────── */}
        <div style={{
          width:270, flexShrink:0, display:'flex', flexDirection:'column',
          background:'var(--panel)', borderLeft:'1px solid var(--border)',
        }}>
          {/* Clip list */}
          <div style={{ flex:1, overflowY:'auto', padding:8 }} ref={listRef}>
            <div style={{
              fontFamily:'var(--font-ui)', fontSize:9, fontWeight:800,
              letterSpacing:1.2, color:'var(--muted)', textTransform:'uppercase',
              padding:'4px 4px 8px',
            }}>
              Clips ({orderedClips.length})
            </div>
            {orderedClips.length === 0 ? (
              <div style={{ fontFamily:'var(--font-body)', fontSize:12, color:'var(--muted)', padding:8, lineHeight:1.7 }}>
                No clips. Mark IN/OUT in the main view first.
              </div>
            ) : orderedClips.map((clip, i) => (
              <div
                key={clip.id}
                onClick={() => goTo(i)}
                style={{
                  display:'flex', alignItems:'center', gap:8,
                  padding:'8px 10px', marginBottom:3, borderRadius:3, cursor:'pointer',
                  background: i === clipIndex ? 'rgba(232,86,10,0.15)' : 'var(--bg)',
                  border:`1px solid ${i === clipIndex ? 'var(--brand)' : 'var(--border)'}`,
                }}
              >
                <div style={{
                  width:20, height:20, borderRadius:'50%', flexShrink:0,
                  background: i === clipIndex ? 'var(--brand)' : 'var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-ui)', fontSize:9, fontWeight:800,
                  color: i === clipIndex ? '#fff' : 'var(--muted)',
                }}>
                  {i+1}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontFamily:'var(--font-ui)', fontWeight:700, fontSize:11,
                    color: i === clipIndex ? 'var(--brand)' : 'var(--text)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                    {clip.label}
                  </div>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--muted)' }}>
                    {fmt(clip.inPoint)} → {fmt(clip.outPoint)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Player card */}
          {currentPlayer && (
            <div style={{ borderTop:'1px solid var(--border)', padding:'10px 12px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                <span style={{ fontFamily:'var(--font-ui)', fontWeight:800, fontStyle:'italic', fontSize:17, color:'var(--brand)' }}>
                  #{currentPlayer.number}
                </span>
                <span style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:13, color:'var(--text)', flex:1 }}>
                  {currentPlayer.name}
                </span>
                {currentPlayer.coachScore != null && (
                  <span style={{ fontFamily:'var(--font-ui)', fontSize:10, fontWeight:800, color:'var(--amber)' }}>
                    {currentPlayer.coachScore}/10
                  </span>
                )}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                {Object.entries(statCounts).map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily:'var(--font-ui)', fontSize:9, fontWeight:700,
                    letterSpacing:0.4, textTransform:'uppercase',
                    color: STAT_COLORS[k] || 'var(--muted)',
                    border:`1px solid ${STAT_COLORS[k] || 'var(--border)'}55`,
                    padding:'1px 6px', borderRadius:2,
                    background:`${STAT_COLORS[k] || 'var(--muted)'}14`,
                  }}>
                    {k.replace(/_/g,' ')}: {v}
                  </span>
                ))}
              </div>
              {currentPlayer.comments?.trim() && (
                <div style={{
                  fontFamily:'var(--font-body)', fontSize:11, color:'var(--muted)',
                  fontStyle:'italic', lineHeight:1.5, borderLeft:'2px solid var(--brand)', paddingLeft:8,
                }}>
                  "{currentPlayer.comments}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Small components ─────────────────────────────────────────────────────────

function ToolBtn({ onClick, children, active, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? 'rgba(232,86,10,0.2)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--muted)',
        border:`1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
        padding:'4px 10px', borderRadius:2, cursor:'pointer',
        fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700,
        letterSpacing:0.4, whiteSpace:'nowrap',
        transition:'all 0.1s',
      }}
    >
      {children}
    </button>
  )
}

function NavBtn({ onClick, disabled, children, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: disabled ? 'transparent' : 'var(--bg)',
        color: disabled ? 'var(--border)' : 'var(--text)',
        border:`1px solid ${disabled ? 'var(--border)' : 'var(--border-2)'}`,
        padding:'8px 18px', borderRadius:3, cursor: disabled ? 'default' : 'pointer',
        fontFamily:'var(--font-ui)', fontSize:13, fontWeight:700,
      }}
    >
      {children}
    </button>
  )
}

function PlayBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:'var(--brand)', color:'#fff', border:'none',
        width:54, height:54, borderRadius:'50%', cursor:'pointer',
        fontFamily:'var(--font-ui)', fontSize:20,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}
    >
      {children}
    </button>
  )
}

function SkipBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background:'var(--bg)', color:'var(--text)',
        border:'1px solid var(--border)',
        padding:'6px 10px', borderRadius:3, cursor:'pointer',
        fontFamily:'var(--font-ui)', fontSize:11, fontWeight:700, letterSpacing:0.3,
      }}
    >
      {children}
    </button>
  )
}

function topBtnStyle() {
  return {
    background:'transparent', color:'var(--muted)', border:'1px solid var(--border)',
    padding:'4px 12px', borderRadius:2, fontFamily:'var(--font-ui)',
    fontSize:10, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', cursor:'pointer',
  }
}
