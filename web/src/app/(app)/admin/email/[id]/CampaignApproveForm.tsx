'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { Send, Clock, TestTube, Eye, Trash2, ImagePlus, Paperclip, X, FileText, BookOpen } from 'lucide-react'
import { updateCampaign, sendTestEmail, approveCampaignNow, scheduleCampaign, deleteCampaign, updateCampaignAttachments, type EmailAttachment } from '../actions'

interface Campaign {
  id: string
  subject: string
  body_html: string
  cta_label: string | null
  cta_url: string | null
  segment: string
  status: string
  test_sent_at: string | null
  scheduled_at: string | null
  attachments?: EmailAttachment[]
}

interface CampaignApproveFormProps {
  campaign: Campaign
  adminEmail: string
  suggestedSchedule: string
}

const SEGMENTS = [
  { value: 'all', label: 'All users' },
  { value: 'coaches', label: 'Coaches only' },
  { value: 'club_admins', label: 'Club admins only' },
  { value: 'free', label: 'Free tier' },
  { value: 'pro', label: 'Pro subscribers' },
]

export function CampaignApproveForm({ campaign, adminEmail, suggestedSchedule }: CampaignApproveFormProps) {
  const [subject, setSubject] = useState(campaign.subject)
  const [body, setBody] = useState(campaign.body_html)
  const [ctaLabel, setCtaLabel] = useState(campaign.cta_label ?? '')
  const [ctaUrl, setCtaUrl] = useState(campaign.cta_url ?? '')
  const [segment, setSegment] = useState(campaign.segment)
  const [scheduledAt, setScheduledAt] = useState(campaign.scheduled_at?.slice(0, 16) ?? suggestedSchedule)
  const [error, setError] = useState('')
  const [testSent, setTestSent] = useState(!!campaign.test_sent_at)
  const [previewHtml, setPreviewHtml] = useState('')
  const [isSaving, startSave] = useTransition()
  const [isTesting, startTest] = useTransition()
  const [isApproving, startApprove] = useTransition()
  const [isScheduling, startSchedule] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<EmailAttachment[]>(
    (campaign as Campaign & { attachments?: EmailAttachment[] }).attachments ?? []
  )
  const [isUploading, setIsUploading] = useState(false)
  const [attachmentError, setAttachmentError] = useState('')
  const [showSessionPicker, setShowSessionPicker] = useState(false)
  const [sessionPlans, setSessionPlans] = useState<{ id: string; title: string }[]>([])
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Fetch preview HTML with 300ms debounce whenever editable fields change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!body.trim()) { setPreviewHtml(''); return }
      try {
        const res = await fetch('/api/email-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bodyHtml: body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined }),
        })
        if (res.ok) {
          const data = await res.json()
          setPreviewHtml(data.html)
        }
      } catch {
        // Preview fetch failure is non-fatal
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [body, ctaLabel, ctaUrl])

  // Initial preview load on mount
  useEffect(() => {
    if (!body.trim()) return
    fetch('/api/email-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bodyHtml: body, ctaLabel: ctaLabel || undefined, ctaUrl: ctaUrl || undefined }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.html) setPreviewHtml(data.html) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function save() {
    startSave(async () => {
      const result = await updateCampaign(campaign.id, {
        subject, body_html: body,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        segment,
      })
      if (result.error) setError(result.error)
    })
  }

  function handleTest() {
    startTest(async () => {
      const result = await sendTestEmail(campaign.id, adminEmail)
      if (result.error) { setError(result.error); return }
      setTestSent(true)
    })
  }

  function handleApproveNow() {
    if (!testSent) return
    setError('')
    startApprove(async () => {
      const result = await approveCampaignNow(campaign.id)
      if (result?.error) setError(result.error)
    })
  }

  function handleSchedule() {
    if (!testSent) return
    startSchedule(async () => {
      await scheduleCampaign(campaign.id, new Date(scheduledAt).toISOString())
    })
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    startDelete(async () => {
      await deleteCampaign(campaign.id)
    })
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setAttachmentError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/email-assets/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setAttachmentError(data.error ?? 'Upload failed'); return }
      const tag = `<img src="${data.url}" alt="${file.name.replace(/\.[^.]+$/, '')}" width="480" style="display:block;width:100%;max-width:480px;height:auto;border-radius:10px;margin:0 0 16px;" />`
      const textarea = bodyRef.current
      if (textarea) {
        const start = textarea.selectionStart ?? body.length
        const end = textarea.selectionEnd ?? body.length
        const newBody = body.slice(0, start) + tag + body.slice(end)
        setBody(newBody)
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + tag.length
          textarea.focus()
        })
      } else {
        setBody(prev => prev + '\n' + tag)
      }
    } catch {
      setAttachmentError('Image upload failed')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (attachments.length >= 2) { setAttachmentError('Maximum 2 attachments per campaign'); return }
    setIsUploading(true)
    setAttachmentError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/email-assets/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setAttachmentError(data.error ?? 'Upload failed'); return }
      const newAttachments: EmailAttachment[] = [...attachments, { type: 'file', url: data.url, filename: file.name }]
      setAttachments(newAttachments)
      await updateCampaignAttachments(campaign.id, newAttachments)
    } catch {
      setAttachmentError('PDF upload failed')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  async function loadSessionPlans() {
    setShowSessionPicker(true)
    if (sessionPlans.length > 0) return
    try {
      const res = await fetch('/api/admin/session-plans')
      if (res.ok) {
        const data = await res.json()
        setSessionPlans(data.sessions ?? [])
      }
    } catch {
      setAttachmentError('Failed to load session plans')
    }
  }

  async function attachSessionPlan(sessionId: string) {
    if (attachments.length >= 2) { setAttachmentError('Maximum 2 attachments per campaign'); return }
    setIsGeneratingPdf(true)
    setShowSessionPicker(false)
    setAttachmentError('')
    try {
      const res = await fetch('/api/admin/session-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) { setAttachmentError(data.error ?? 'PDF generation failed'); return }
      const newAttachments: EmailAttachment[] = [...attachments, { type: 'session_plan', url: data.url, filename: data.filename }]
      setAttachments(newAttachments)
      await updateCampaignAttachments(campaign.id, newAttachments)
    } catch {
      setAttachmentError('Failed to generate PDF')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function removeAttachment(index: number) {
    const newAttachments = attachments.filter((_, i) => i !== index)
    setAttachments(newAttachments)
    await updateCampaignAttachments(campaign.id, newAttachments)
  }

  void isSaving

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-6 items-start">
      {/* ── Left: edit form ── */}
      <div className="space-y-4 p-6 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            onBlur={save}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Body HTML</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">Use <code className="text-[#e8560a]">{'{{name}}'}</code> for recipient&apos;s name</span>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageUpload} />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                <ImagePlus size={12} />
                {isUploading ? 'Uploading...' : 'Insert image'}
              </button>
            </div>
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onBlur={save}
            rows={12}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 font-mono resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA label</label>
            <input type="text" value={ctaLabel} onChange={e => setCtaLabel(e.target.value)} onBlur={save}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">CTA URL</label>
            <input type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)} onBlur={save}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Segment</label>
          <select value={segment} onChange={e => { setSegment(e.target.value); save() }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500">
            {SEGMENTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* ── PDF Attachments ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Attachments <span className="text-zinc-600 normal-case font-normal">(PDF · max 2)</span>
            </label>
            {attachments.length < 2 && (
              <div className="flex items-center gap-2 relative">
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
                <button
                  type="button"
                  onClick={() => pdfInputRef.current?.click()}
                  disabled={isUploading || isGeneratingPdf}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
                >
                  <Paperclip size={12} />
                  Upload PDF
                </button>
                <button
                  type="button"
                  onClick={loadSessionPlans}
                  disabled={isUploading || isGeneratingPdf}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-50"
                >
                  <BookOpen size={12} />
                  {isGeneratingPdf ? 'Generating...' : 'Coaching plan'}
                </button>
                {showSessionPicker && (
                  <div className="absolute right-0 top-8 z-10 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl p-2 space-y-1">
                    <p className="text-xs text-zinc-500 px-2 py-1">Select a session plan:</p>
                    {sessionPlans.length === 0 && (
                      <p className="text-xs text-zinc-600 px-2 py-2">No session plans found</p>
                    )}
                    {sessionPlans.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => attachSessionPlan(s.id)}
                        className="w-full text-left text-sm text-zinc-300 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors truncate"
                      >
                        {s.title}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowSessionPicker(false)}
                      className="w-full text-xs text-zinc-600 px-3 py-1.5 hover:text-zinc-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {attachmentError && <p className="text-xs text-red-400">{attachmentError}</p>}
          {attachments.length === 0 ? (
            <p className="text-xs text-zinc-600">No attachments — uploaded PDFs will be sent with every email</p>
          ) : (
            <div className="space-y-1.5">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className="text-zinc-500 flex-shrink-0" />
                    <span className="text-xs text-zinc-300 truncate">{att.filename}</span>
                    {att.type === 'session_plan' && (
                      <span className="text-xs text-sky-400 flex-shrink-0 ml-1">Coaching plan</span>
                    )}
                  </div>
                  <button type="button" onClick={() => removeAttachment(i)} className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2 flex-wrap">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors disabled:opacity-50"
          >
            <TestTube size={14} />
            {isTesting ? 'Sending test...' : testSent ? 'Resend test' : 'Send test to me'}
          </button>

          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              disabled={!testSent}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500 disabled:opacity-40"
            />
            <button
              onClick={handleSchedule}
              disabled={!testSent || isScheduling}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-blue-500/40 text-blue-400 hover:border-blue-500/70 transition-colors disabled:opacity-40"
            >
              <Clock size={14} />
              {isScheduling ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>

          <button
            onClick={handleApproveNow}
            disabled={!testSent || isApproving}
            className="flex items-center gap-1.5 text-sm px-5 py-2 rounded-lg bg-[#e8560a] text-white font-semibold hover:bg-[#d04e09] transition-colors disabled:opacity-40"
          >
            <Send size={14} />
            {isApproving ? 'Sending...' : 'Approve & send now'}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            onBlur={() => setConfirmDelete(false)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border transition-colors disabled:opacity-50 ml-auto ${
              confirmDelete
                ? 'border-red-500/60 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : confirmDelete ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Right: live preview ── */}
      <div className="space-y-2 sticky top-6">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Email preview</span>
          <span className="text-xs text-zinc-600 ml-1">· Updates as you type</span>
        </div>
        {previewHtml ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-[700px] rounded-xl border border-zinc-800"
            sandbox="allow-same-origin"
            title="Email preview"
          />
        ) : (
          <div className="w-full h-[700px] rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-center">
            <p className="text-sm text-zinc-600">Start writing your email to see a preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
