import React, { useState, useEffect } from 'react'

export default function GameLibrary({ onLoad, onNew, onClose, onContinue, crashSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [oldDataLocations, setOldDataLocations] = useState(null) // null=scanning, []=none, [...]=found
  const [sessionsFolder, setSessionsFolder] = useState(null)

  useEffect(() => {
    window.electron?.listSessions().then(s => {
      setSessions(s || [])
      setLoading(false)
    })
    window.electron?.findOldSessionData?.().then(found => {
      setOldDataLocations(found || [])
    })
    window.electron?.getSettings?.().then(s => {
      setSessionsFolder(s?.sessionsFolder || null)
    })
  }, [])

  const handleChooseFolder = async () => {
    const chosen = await window.electron?.chooseSessionsFolder()
    if (chosen) {
      setSessionsFolder(chosen)
      const s = await window.electron?.listSessions()
      setSessions(s || [])
    }
  }

  const handleResetFolder = async () => {
    await window.electron?.clearSessionsFolder()
    setSessionsFolder(null)
    const s = await window.electron?.listSessions()
    setSessions(s || [])
  }

  const doImport = async (knownPath) => {
    setImporting(true)
    setImportMsg(null)
    const result = await window.electron?.importSessionsFromFolder(knownPath)
    setImporting(false)
    if (!result) return
    if (result.error) { setImportMsg(`Error: ${result.error}`); return }
    if (result.imported === 0) {
      setImportMsg('No new sessions found there.')
    } else {
      setImportMsg(`Restored ${result.imported} session${result.imported !== 1 ? 's' : ''}`)
      const s = await window.electron?.listSessions()
      setSessions(s || [])
      setOldDataLocations([])
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
              <ImportPanel
                oldDataLocations={oldDataLocations}
                importing={importing}
                importMsg={importMsg}
                onImport={doImport}
              />
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

        {/* Storage location row */}
        <div style={{
          padding: '8px 18px', borderTop: '1px solid var(--border)', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.02)',
        }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', flexShrink: 0 }}>
            Saved to
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted-2)',
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }} title={sessionsFolder || 'Default (AppData)'}>
            {sessionsFolder || 'Default location (AppData)'}
          </span>
          <button
            onClick={handleChooseFolder}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', padding: '3px 8px', borderRadius: 2,
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            Change
          </button>
          {sessionsFolder && (
            <button
              onClick={handleResetFolder}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--muted-2)', padding: '3px 4px',
                fontFamily: 'var(--font-ui)', fontSize: 11,
                cursor: 'pointer', flexShrink: 0,
              }}
              title="Reset to default location"
            >
              ×
            </button>
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
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: importMsg.startsWith('Restored') ? 'var(--green)' : 'var(--muted)' }}>
                  {importMsg}
                </span>
              )}
              {oldDataLocations && oldDataLocations.length > 0 ? (
                oldDataLocations.map(loc => (
                  <button
                    key={loc.dir}
                    onClick={() => doImport(loc.dir)}
                    disabled={importing}
                    style={{
                      background: 'rgba(232,86,10,0.1)', color: 'var(--brand)',
                      border: '1px solid rgba(232,86,10,0.3)', padding: '6px 14px',
                      borderRadius: 3, fontFamily: 'var(--font-ui)', fontSize: 10,
                      fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Restore {loc.count} session{loc.count !== 1 ? 's' : ''} from {loc.label}
                  </button>
                ))
              ) : (
                <button
                  onClick={() => doImport(null)}
                  disabled={importing}
                  style={{
                    background: 'transparent', color: 'var(--muted)',
                    border: '1px solid var(--border)', padding: '6px 14px',
                    borderRadius: 3, fontFamily: 'var(--font-ui)', fontSize: 10,
                    fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                    cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                  title="Browse for the folder where the old app was saved"
                >
                  {importing ? 'Selecting…' : 'Import old sessions'}
                </button>
              )}
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

function ImportPanel({ oldDataLocations, importing, importMsg, onImport }) {
  const scanning = oldDataLocations === null
  const found    = oldDataLocations && oldDataLocations.length > 0

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 4 }}>
      {scanning ? (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)' }}>
          Checking for previous sessions…
        </div>
      ) : found ? (
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Found previous sessions on this computer:
          </div>
          {oldDataLocations.map(loc => (
            <button
              key={loc.dir}
              onClick={() => onImport(loc.dir)}
              disabled={importing}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'rgba(232,86,10,0.08)', border: '1px solid rgba(232,86,10,0.25)',
                color: 'var(--text)', padding: '8px 14px', borderRadius: 3, marginBottom: 6,
                fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
                cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
              }}
            >
              <span style={{ color: 'var(--brand)' }}>↩ Restore {loc.count} session{loc.count !== 1 ? 's' : ''}</span>
              <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>from {loc.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Updated from an older version? Browse to the folder where you kept the old app to restore your sessions.
          </div>
          <button
            onClick={() => onImport(null)}
            disabled={importing}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text)', padding: '7px 16px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, cursor: importing ? 'default' : 'pointer', opacity: importing ? 0.5 : 1,
            }}
          >
            {importing ? 'Selecting folder…' : 'Browse for old sessions…'}
          </button>
        </div>
      )}
      {importMsg && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-body)', fontSize: 11, color: importMsg.startsWith('Restored') ? 'var(--green)' : 'var(--muted)' }}>
          {importMsg}
        </div>
      )}
    </div>
  )
}
