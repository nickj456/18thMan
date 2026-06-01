import React, { useState, useEffect } from 'react'

export default function GameLibrary({ onLoad, onNew, onClose, onContinue, crashSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  useEffect(() => {
    window.electron?.listSessions().then(s => {
      setSessions(s || [])
      setLoading(false)
    })
  }, [])

  const handleImport = async () => {
    setImporting(true)
    setImportMsg(null)
    const result = await window.electron?.importSessionsFromFolder()
    setImporting(false)
    if (!result) return
    if (result.error) { setImportMsg(`Error: ${result.error}`); return }
    if (result.imported === 0) {
      setImportMsg('No new sessions found in that folder. Make sure you selected the folder where the old app was saved (e.g. Downloads).')
    } else {
      setImportMsg(`Imported ${result.imported} session${result.imported !== 1 ? 's' : ''}!`)
      const s = await window.electron?.listSessions()
      setSessions(s || [])
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setDeleting(id)
    await window.electron?.deleteSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  const fmtDate = (iso) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch { return '' }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(7,8,13,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 5, width: 560, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 15, color: 'var(--brand)' }}>
              18thMan Match Analyst
            </div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--muted)', textTransform: 'uppercase', marginTop: 2 }}>
              Game Library
            </div>
          </div>
          <button
            onClick={onNew}
            style={{
              background: 'var(--brand)', color: '#fff', border: 'none',
              padding: '8px 18px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
              letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            + New Session
          </button>
        </div>

        {/* Continue last session — shown first if crash recovery exists */}
        {onContinue && crashSession && (
          <div
            onClick={onContinue}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: 'rgba(232,86,10,0.08)',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,86,10,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(232,86,10,0.08)'}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--brand)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16,
            }}>
              ↩
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13,
                color: 'var(--brand)', marginBottom: 3,
              }}>
                Continue where you left off
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {crashSession.players?.filter(p => !p.isOpposition && p.name !== `Player ${p.number}`).length > 0 && (
                  <Pill>{crashSession.players.filter(p => !p.isOpposition).length} players</Pill>
                )}
                {crashSession.events?.length > 0 && <Pill>{crashSession.events.length} events</Pill>}
                {crashSession.clips?.length > 0 && <Pill>{crashSession.clips.length} clips</Pill>}
                {crashSession.matchInfo?.opposition && (
                  <Pill>vs {crashSession.matchInfo.opposition}</Pill>
                )}
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)',
            }}>
              Unsaved
            </div>
          </div>
        )}

        {/* Session list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, fontFamily: 'var(--font-body)', color: 'var(--muted)', fontSize: 13 }}>
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                No saved sessions yet
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.7, marginBottom: 20 }}>
                Analyse a match and click <strong style={{ color: 'var(--text)' }}>SAVE</strong> to store it here permanently.
              </div>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
                  Updated from an older version? Import your previous sessions:
                </div>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text)', padding: '7px 16px', borderRadius: 3,
                    fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
                    letterSpacing: 0.5, cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
                  }}
                >
                  {importing ? 'Selecting folder…' : 'Import sessions from previous install'}
                </button>
                {importMsg && (
                  <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 11, color: importMsg.startsWith('Imported') ? 'var(--green)' : 'var(--muted)', lineHeight: 1.5 }}>
                    {importMsg}
                  </div>
                )}
              </div>
            </div>
          ) : (
            sessions.map((s) => {
              const hasScore = s.ourScore !== '' && s.oppScore !== ''
              return (
                <div
                  key={s.id}
                  onClick={() => onLoad(s.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', marginBottom: 6,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 4, cursor: 'pointer', transition: 'border-color 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {/* Date column */}
                  <div style={{
                    width: 44, textAlign: 'center', flexShrink: 0,
                    padding: '4px 0', background: 'var(--panel)', borderRadius: 3,
                  }}>
                    <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 15, color: 'var(--brand)', lineHeight: 1 }}>
                      {s.date ? new Date(s.date + 'T12:00').getDate() : '—'}
                    </div>
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {s.date ? new Date(s.date + 'T12:00').toLocaleString('en-GB', { month: 'short' }) : ''}
                    </div>
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic', fontSize: 13, color: 'var(--text)' }}>
                        {s.name}
                      </span>
                      {hasScore && (
                        <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 11, color: 'var(--brand)' }}>
                          {s.ourScore} – {s.oppScore}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Pill>{s.playerCount} players</Pill>
                      <Pill>{s.eventCount} events</Pill>
                      <Pill>{s.clipCount} clips</Pill>
                      {s.savedAt && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)' }}>
                          saved {fmtDate(s.savedAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    disabled={deleting === s.id}
                    style={{
                      background: 'none', border: 'none', color: 'var(--muted-2)',
                      cursor: 'pointer', fontSize: 14, padding: '4px 6px',
                      borderRadius: 2, flexShrink: 0,
                    }}
                    title="Delete session"
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted-2)'}
                  >
                    ✕
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div style={{
            padding: '10px 18px', borderTop: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', padding: '6px 14px',
                borderRadius: 3, fontFamily: 'var(--font-ui)', fontSize: 10,
                fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Continue without loading
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {importMsg && (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: importMsg.startsWith('Imported') ? 'var(--green)' : 'var(--muted)' }}>
                  {importMsg}
                </span>
              )}
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  background: 'transparent', color: 'var(--muted)',
                  border: '1px solid var(--border)', padding: '6px 14px',
                  borderRadius: 3, fontFamily: 'var(--font-ui)', fontSize: 10,
                  fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                  cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
                title="Import sessions saved by a previous installation"
              >
                {importing ? 'Selecting…' : 'Import old sessions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
      color: 'var(--muted)', border: '1px solid var(--border)',
      padding: '1px 6px', borderRadius: 2, letterSpacing: 0.3,
    }}>
      {children}
    </span>
  )
}
