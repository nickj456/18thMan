import React, { useState } from 'react'
import { exportCsv, generatePdfHtml } from '../utils/export'
import EmailSettings from './EmailSettings'
import ExportModal from './ExportModal'
import logoUrl from '../../assets/logo.png'

export default function Header({
  videoFile, events, clips, players, outputFolder, showNotification,
  matchInfo, setMatchInfo, sharedReports,
  onSaveSession, onOpenLibrary, onPresent, sessionName,
  authProfile, isTrial, trialDaysLeft, onSignOut,
  isDirty,
}) {
  const [showInfo, setShowInfo]                   = useState(false)
  const [showEmailSettings, setShowEmailSettings] = useState(false)
  const [showExportModal, setShowExportModal]     = useState(false)

  const set = (k, v) => setMatchInfo(p => ({ ...p, [k]: v }))

  const hasScore = matchInfo.ourScore !== '' || matchInfo.oppScore !== ''
  const scoreStr = hasScore
    ? `${matchInfo.ourScore || '0'} – ${matchInfo.oppScore || '0'}`
    : null

  const handleExportCsv = (sections) => {
    if (events.length === 0) { showNotification('No events to export', 'error'); return }
    exportCsv(events, players, matchInfo, sections)
    showNotification('CSV exported')
  }

  const handleExportPdf = async (sections) => {
    if (!outputFolder) { showNotification('Choose an output folder first', 'error'); return }
    const html = generatePdfHtml({ events, players, clips, matchInfo, sharedReports, sections })
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputPath = `${outputFolder}\\match-report-${ts}.pdf`
    try {
      await window.electron.printPdf({ html, outputPath })
      showNotification(`PDF saved: match-report-${ts}.pdf`)
    } catch {
      showNotification('PDF export failed', 'error')
    }
  }

  return (
    <div className="drag-region" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 0 0 14px', height: 52,
      background: 'var(--panel)', borderBottom: '1px solid var(--border)',
      flexShrink: 0, position: 'relative',
    }}>
      {/* Logo + wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <img
          src={logoUrl} alt="18thMan"
          style={{ height: 32, objectFit: 'contain', display: 'block' }}
          onError={(e) => { e.target.style.display = 'none' }}
        />
        <div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
            fontSize: 16, letterSpacing: 0.5, color: 'var(--brand)',
            textTransform: 'uppercase', lineHeight: 1,
          }}>
            18thMan
          </div>
          <div style={{
            fontFamily: 'var(--font-ui)', fontWeight: 600,
            fontSize: 9, letterSpacing: 2, color: 'var(--muted)',
            textTransform: 'uppercase', lineHeight: 1, marginTop: 2,
          }}>
            Match Analyst
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 28, background: 'var(--border)', flexShrink: 0 }} />

      {/* Live match info strip */}
      {(matchInfo.club || matchInfo.opposition || scoreStr) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          {matchInfo.club && (
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              {matchInfo.club}
            </span>
          )}
          {scoreStr && (
            <span style={{
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontStyle: 'italic',
              fontSize: 16, color: 'var(--brand)', letterSpacing: 1, whiteSpace: 'nowrap',
            }}>
              {scoreStr}
            </span>
          )}
          {matchInfo.opposition && (
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              {matchInfo.opposition}
            </span>
          )}
          {matchInfo.date && (
            <>
              <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>
                {new Date(matchInfo.date + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </>
          )}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>

        {/* Session name + save status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
          {sessionName && (
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-2)',
              whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {sessionName}
            </span>
          )}
          {isDirty ? (
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              color: 'var(--amber)', letterSpacing: 0.3, whiteSpace: 'nowrap',
            }}>
              ● Unsaved
            </span>
          ) : sessionName ? (
            <span style={{
              fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
              color: 'var(--green)', letterSpacing: 0.3, whiteSpace: 'nowrap',
            }}>
              ✓ Saved
            </span>
          ) : null}
        </div>

        {/* Primary: Save */}
        <SaveBtn onClick={onSaveSession} isDirty={isDirty}>
          Save
        </SaveBtn>

        {/* Session Library */}
        <Btn onClick={onOpenLibrary}>Session Library</Btn>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Match Info */}
        <Btn onClick={() => setShowInfo(s => !s)} active={showInfo}>Match Info</Btn>

        {/* Export — opens configurable modal */}
        <Btn onClick={() => setShowExportModal(true)}>Export</Btn>

        {/* Present */}
        <Btn onClick={onPresent} style={{ background: 'rgba(83,74,183,0.15)', borderColor: 'var(--purple)', color: 'var(--purple)' }}>
          ▶ Present
        </Btn>

        {/* Settings */}
        <button
          onClick={() => setShowEmailSettings(s => !s)}
          title="Email settings"
          style={{
            background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
            borderRadius: 2, width: 28, height: 28, cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ⚙
        </button>

        {/* User */}
        {authProfile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {authProfile.display_name || authProfile.club || ''}
            </span>
            <button
              onClick={onSignOut}
              title="Sign out"
              style={{
                background: 'transparent', color: 'var(--muted-2)', border: '1px solid var(--border)',
                borderRadius: 2, padding: '3px 8px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Window controls */}
      <div style={{ display: 'flex', alignItems: 'stretch', marginLeft: 10, flexShrink: 0 }}>
        <WinBtn onClick={() => window.electron?.minimizeWindow()} title="Minimise">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1.5" fill="currentColor"/></svg>
        </WinBtn>
        <WinBtn onClick={() => window.electron?.maximizeWindow()} title="Maximise / Restore">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="0.75" y="0.75" width="8.5" height="8.5" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </WinBtn>
        <WinBtn onClick={() => window.electron?.closeWindow()} title="Close" danger>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </WinBtn>
      </div>

      {/* Match info dropdown */}
      {showInfo && (
        <div style={{
          position: 'absolute', top: 54, right: 154, zIndex: 200,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 3, padding: 16,
          display: 'flex', flexDirection: 'column', gap: 10, minWidth: 300,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <InfoLabel>Club Name</InfoLabel>
          <input value={matchInfo.club} onChange={e => set('club', e.target.value)} placeholder="Your club" />

          <InfoLabel>Opposition</InfoLabel>
          <input value={matchInfo.opposition} onChange={e => set('opposition', e.target.value)} placeholder="Opposition team" />

          <InfoLabel>Date</InfoLabel>
          <input type="date" value={matchInfo.date} onChange={e => set('date', e.target.value)} />

          <InfoLabel>Score</InfoLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
                {matchInfo.club || 'Us'}
              </span>
              <input
                type="number" min="0" max="999"
                value={matchInfo.ourScore}
                onChange={e => set('ourScore', e.target.value)}
                placeholder="0"
                style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 20 }}
              />
            </div>
            <span style={{
              fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 18,
              color: 'var(--brand)', paddingTop: 14,
            }}>–</span>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)' }}>
                {matchInfo.opposition || 'Opposition'}
              </span>
              <input
                type="number" min="0" max="999"
                value={matchInfo.oppScore}
                onChange={e => set('oppScore', e.target.value)}
                placeholder="0"
                style={{ textAlign: 'center', fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 20 }}
              />
            </div>
          </div>

          <Btn onClick={() => setShowInfo(false)} style={{ marginTop: 4 }}>Done</Btn>
        </div>
      )}

      {/* Trial warning */}
      {isTrial && trialDaysLeft <= 7 && (
        <div style={{
          position: 'absolute', top: 54, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(245,158,11,0.12)', border: '1px solid var(--amber)',
          borderRadius: 3, padding: '5px 14px', fontSize: 11,
          fontFamily: 'var(--font-ui)', color: 'var(--amber)', fontWeight: 700,
          whiteSpace: 'nowrap', zIndex: 100,
        }}>
          Trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''}
        </div>
      )}

      {showEmailSettings && <EmailSettings onClose={() => setShowEmailSettings(false)} />}

      {showExportModal && (
        <ExportModal
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdf}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}

function SaveBtn({ onClick, children, isDirty }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isDirty ? (hov ? '#c45a08' : 'var(--brand)') : (hov ? 'rgba(232,86,10,0.1)' : 'transparent'),
        color: isDirty ? '#fff' : (hov ? 'var(--brand)' : 'var(--muted)'),
        border: `1px solid ${isDirty ? 'var(--brand)' : (hov ? 'var(--brand)' : 'var(--border)')}`,
        padding: '5px 14px', borderRadius: 2,
        fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
        letterSpacing: 0.8, textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}

function Btn({ onClick, children, accent, active, style }) {
  const [hov, setHov] = useState(false)
  const highlighted = hov || active
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: accent ? (hov ? 'var(--brand-dim)' : 'var(--brand)') : (highlighted ? 'rgba(232,86,10,0.1)' : 'transparent'),
        color: accent ? '#fff' : (highlighted ? 'var(--brand)' : 'var(--muted)'),
        border: `1px solid ${accent ? 'var(--brand)' : (highlighted ? 'var(--brand)' : 'var(--border)')}`,
        padding: '5px 12px', borderRadius: 2,
        fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
        letterSpacing: 0.8, textTransform: 'uppercase',
        cursor: 'pointer', transition: 'all 0.12s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}


function WinBtn({ onClick, children, title, danger }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 46, height: 52, border: 'none', cursor: 'pointer',
        background: danger && hov ? '#c42b1c' : hov ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: hov ? '#fff' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function InfoLabel({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
      letterSpacing: 1.2, color: 'var(--muted)', textTransform: 'uppercase',
    }}>
      {children}
    </span>
  )
}
