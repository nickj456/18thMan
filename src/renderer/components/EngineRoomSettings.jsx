import React, { useState, useEffect } from 'react'

export default function EngineRoomSettings({ onClose, onSaved }) {
  const [settings, setSettings] = useState({ url: '', code: '' })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    window.electron?.loadEngineRoomSettings().then((s) => {
      if (s) setSettings({ url: s.url || '', code: s.code || '' })
    })
  }, [])

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await window.electron?.saveEngineRoomSettings(settings)
    onSaved?.(settings)
    setSaving(false)
    setMsg({ type: 'success', text: 'Settings saved.' })
    setTimeout(() => setMsg(null), 2500)
  }

  // The squad call reads the saved settings, so save what is typed before testing it.
  const handleTest = async () => {
    setTesting(true)
    setMsg(null)
    await window.electron?.saveEngineRoomSettings(settings)
    onSaved?.(settings)
    const result = await window.electron?.getEngineRoomSquad()
    setTesting(false)
    if (result?.success) {
      setMsg({ type: 'success', text: `Connected: ${result.players.length} players` })
    } else {
      setMsg({ type: 'error', text: result?.error || "Couldn't reach Engine Room. Check the address and your internet." })
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(7,8,13,0.7)', zIndex: 9000 }} />
      <div style={{
        position: 'fixed', top: 60, right: 16, zIndex: 9001,
        background: 'var(--panel)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '20px 22px', width: 380,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 800, fontSize: 12, letterSpacing: 0.8, color: 'var(--brand)', textTransform: 'uppercase' }}>
            Engine Room
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <div style={{
          background: 'rgba(232,86,10,0.08)', border: '1px solid rgba(232,86,10,0.25)',
          borderRadius: 3, padding: '8px 10px', marginBottom: 14,
          fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text)', lineHeight: 1.6,
        }}>
          Your Engine Room admin finds both under Matches → Connect 18thMan Analyst.
        </div>

        <Field label="Engine Room address">
          <input
            value={settings.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://your-engine-room.example.com"
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
        </Field>

        <Field label="Connection code">
          <input
            type="password"
            value={settings.code}
            onChange={e => set('code', e.target.value)}
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 10 }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...btnStyle(true), flex: 1 }}>
            {saving ? 'SAVING…' : 'SAVE'}
          </button>
          <button onClick={handleTest} disabled={testing || !settings.url || !settings.code} style={btnStyle(false)}>
            {testing ? 'TESTING…' : 'TEST CONNECTION'}
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: 10,
            fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
            color: msg.type === 'error' ? 'var(--red)' : 'var(--green)',
            padding: '5px 8px', borderRadius: 2,
            border: `1px solid ${msg.type === 'error' ? 'var(--red)' : 'var(--green)'}`,
            background: msg.type === 'error' ? 'rgba(163,45,45,0.1)' : 'rgba(59,109,17,0.1)',
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700,
        letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function btnStyle(accent) {
  return {
    background: accent ? 'var(--brand)' : 'transparent',
    color: accent ? '#fff' : 'var(--muted)',
    border: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}`,
    padding: '7px 14px', borderRadius: 2, width: accent ? '100%' : 'auto',
    fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 800,
    letterSpacing: 0.8, textTransform: 'uppercase', cursor: 'pointer',
  }
}
