import React from 'react'

export default function SessionRestoreModal({ session, onRestore, onDiscard }) {
  const eventCount = session.events?.length ?? 0
  const clipCount = session.clips?.length ?? 0
  const playerCount = session.players?.length ?? 0
  const videoName = session.videoFile?.path?.split(/[/\\]/).pop()

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(7,8,13,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--brand)',
        borderRadius: 3,
        padding: '28px 32px',
        maxWidth: 400, width: '90%',
        boxShadow: '0 0 48px rgba(232,86,10,0.12)',
      }}>
        <div style={{
          fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
          fontSize: 14, letterSpacing: 0.6, color: 'var(--brand)',
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          Restore Previous Session?
        </div>

        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, lineHeight: 1.8, marginBottom: 20 }}>
          <div style={{ color: 'var(--muted)', marginBottom: 8 }}>A saved session was found:</div>
          <div style={{ paddingLeft: 10, borderLeft: '2px solid var(--border)' }}>
            <Row label="Players">{playerCount}</Row>
            <Row label="Events">{eventCount}</Row>
            <Row label="Clips">{clipCount}</Row>
            {videoName && <Row label="Video">{videoName}</Row>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onRestore(session)}
            style={{
              flex: 1, background: 'var(--brand)', color: '#fff',
              border: 'none', padding: '9px 0', borderRadius: 2,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Restore Session
          </button>
          <button
            onClick={onDiscard}
            style={{
              flex: 1, background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', padding: '9px 0', borderRadius: 2,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              letterSpacing: 0.4, textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
      <span style={{ fontFamily: 'var(--font-ui)', color: 'var(--muted)', fontSize: 11, minWidth: 56 }}>{label}:</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, color: 'var(--brand)', fontSize: 11 }}>{children}</span>
    </div>
  )
}
