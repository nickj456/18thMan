import React, { useState } from 'react'
import { DEFAULT_EXPORT_SECTIONS } from '../utils/export'

const SECTION_DEFS = [
  { key: 'matchInfo',      label: 'Match Info',          desc: 'Club, opposition, date and score header' },
  { key: 'playerStats',    label: 'Player Stats',         desc: 'Per-player breakdown of every event type with metrics' },
  { key: 'coachNotes',     label: 'Coach Scores & Notes', desc: 'Your 1–10 score and coaching comments for each player' },
  { key: 'eventsTimeline', label: 'Events Timeline',      desc: 'Chronological log of every tagged event' },
]

export default function ExportModal({ onExportCsv, onExportPdf, onClose }) {
  const [sections, setSections] = useState({ ...DEFAULT_EXPORT_SECTIONS })
  const [exporting, setExporting] = useState(null)

  const toggle = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }))

  const handleCsv = async () => {
    setExporting('csv')
    await onExportCsv(sections)
    setExporting(null)
    onClose()
  }

  const handlePdf = async () => {
    setExporting('pdf')
    await onExportPdf(sections)
    setExporting(null)
    onClose()
  }

  const anySelected = Object.values(sections).some(Boolean)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9100,
      background: 'rgba(7,8,13,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 5, width: 420,
        boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>
              Export Report
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Choose what to include
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>
            ✕
          </button>
        </div>

        {/* Section toggles */}
        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SECTION_DEFS.map(({ key, label, desc }) => (
            <label
              key={key}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '10px 12px', borderRadius: 3, cursor: 'pointer',
                background: sections[key] ? 'rgba(232,86,10,0.07)' : 'var(--bg)',
                border: `1px solid ${sections[key] ? 'rgba(232,86,10,0.3)' : 'var(--border)'}`,
                transition: 'all 0.12s',
              }}
            >
              <input
                type="checkbox"
                checked={sections[key]}
                onChange={() => toggle(key)}
                style={{ marginTop: 2, accentColor: 'var(--brand)', width: 14, height: 14, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 12, color: sections[key] ? 'var(--text)' : 'var(--muted)' }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--muted-2)', marginTop: 2, lineHeight: 1.4 }}>
                  {desc}
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Quick toggles */}
        <div style={{ padding: '0 18px 10px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => setSections(Object.fromEntries(SECTION_DEFS.map(s => [s.key, true])))}
            style={{ background: 'none', border: 'none', color: 'var(--brand)', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Select all
          </button>
          <span style={{ color: 'var(--border)' }}>·</span>
          <button
            onClick={() => setSections(Object.fromEntries(SECTION_DEFS.map(s => [s.key, false])))}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-ui)', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Clear all
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center',
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--muted)', padding: '7px 16px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCsv}
            disabled={!anySelected || !!exporting}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: anySelected ? 'var(--text)' : 'var(--muted-2)',
              padding: '7px 16px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              cursor: anySelected && !exporting ? 'pointer' : 'not-allowed',
              opacity: anySelected ? 1 : 0.4,
            }}
          >
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={handlePdf}
            disabled={!anySelected || !!exporting}
            style={{
              background: anySelected ? 'var(--brand)' : 'transparent',
              border: '1px solid var(--brand)',
              color: anySelected ? '#fff' : 'var(--muted-2)',
              padding: '7px 18px', borderRadius: 3,
              fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 700,
              cursor: anySelected && !exporting ? 'pointer' : 'not-allowed',
              opacity: anySelected ? 1 : 0.4,
            }}
          >
            {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
