import React, { useState, useRef, useEffect } from 'react'

export default function MatchClock() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        fontFamily: 'var(--font-mono)',
        color: running ? 'var(--brand)' : 'var(--muted)',
        fontSize: 13, fontWeight: 700, minWidth: 46, textAlign: 'center',
        letterSpacing: 1, transition: 'color 0.2s',
      }}>
        {fmt(elapsed)}
      </span>
      <ClkBtn onClick={() => setRunning(r => !r)} active={running}>
        {running ? 'PAUSE' : 'START'}
      </ClkBtn>
      <ClkBtn onClick={() => { setRunning(false); setElapsed(0) }}>RST</ClkBtn>
    </div>
  )
}

function ClkBtn({ onClick, children, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(232,86,10,0.15)' : 'transparent',
      color: active ? 'var(--brand)' : 'var(--muted)',
      border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
      padding: '2px 7px', borderRadius: 2,
      fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700,
      letterSpacing: 0.5, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}
