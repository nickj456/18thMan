import React, { useState, useEffect } from 'react'

export default function EmailSettings({ onClose }) {
  const [settings, setSettings] = useState({
    supabaseUrl: '',
    supabaseAnonKey: '',
    fromName: '',
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    window.electron?.loadEmailSettings().then((s) => {
      if (s) setSettings(s)
    })
  }, [])

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    await window.electron?.saveEmailSettings(settings)
    setSaving(false)
    setMsg({ type: 'success', text: 'Settings saved.' })
    setTimeout(() => setMsg(null), 2500)
  }

  const handleTest = async () => {
    if (!testEmail) { setMsg({ type: 'error', text: 'Enter a test address.' }); return }
    setTesting(true)
    setMsg(null)
    const result = await window.electron?.sendEmail({
      to: testEmail,
      subject: '18thMan Match Analyst — Email test',
      html: `<p>Your email integration is working correctly. This test was sent from <strong>18thMan Match Analyst</strong>.</p>`,
      text: 'Your email integration is working correctly.',
    })
    setTesting(false)
    if (result?.success) {
      setMsg({ type: 'success', text: `Test email sent to ${testEmail}` })
    } else {
      setMsg({ type: 'error', text: result?.error || 'Send failed. Check settings.' })
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
            Email Settings
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* How-to note */}
        <div style={{
          background: 'rgba(232,86,10,0.08)', border: '1px solid rgba(232,86,10,0.25)',
          borderRadius: 3, padding: '8px 10px', marginBottom: 14,
          fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text)', lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--brand)' }}>Setup required:</strong> Deploy the edge function to your Supabase project first — see <code style={{ color: 'var(--brand)' }}>supabase/functions/send-match-email/</code> in this project folder.
        </div>

        <Field label="Supabase Project URL">
          <input
            value={settings.supabaseUrl}
            onChange={e => set('supabaseUrl', e.target.value)}
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 11 }}
          />
        </Field>

        <Field label="Supabase Anon Key">
          <input
            type="password"
            value={settings.supabaseAnonKey}
            onChange={e => set('supabaseAnonKey', e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 10 }}
          />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
            Found in Supabase Dashboard → Settings → API
          </div>
        </Field>

        <Field label="From Name (shown to parents)">
          <input
            value={settings.fromName}
            onChange={e => set('fromName', e.target.value)}
            placeholder="Waterhead Warriors Coaching Team"
            style={{ width: '100%' }}
          />
        </Field>

        <button onClick={handleSave} disabled={saving} style={btnStyle(true)}>
          {saving ? 'SAVING…' : 'SAVE SETTINGS'}
        </button>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
            Send Test Email
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              onKeyDown={e => { if (e.key === 'Enter') handleTest() }}
            />
            <button onClick={handleTest} disabled={testing || !settings.supabaseUrl} style={btnStyle(false)}>
              {testing ? '…' : 'SEND'}
            </button>
          </div>
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
