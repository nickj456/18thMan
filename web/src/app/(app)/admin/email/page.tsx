import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ArrowLeft, Plus, Send, FileText, AlertCircle, MailOpen, MousePointerClick } from 'lucide-react'

export const metadata = { title: 'Email Campaigns — Admin' }

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-800 text-zinc-400' },
  ready: { label: 'Ready to send', className: 'bg-amber-500/20 text-amber-400' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/20 text-blue-400' },
  sent: { label: 'Sent', className: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-800 text-zinc-600' },
}

const TRIGGER_LABELS: Record<string, string> = {
  new_public_drill: 'New Drill',
  weekly_focus: 'Weekly Focus',
  podcast: 'Podcast',
  wellbeing: 'Wellbeing',
  announcement: 'Announcement',
  poll: 'Poll',
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'queue' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: campaigns } = await supabase
    .from('email_campaigns')
    .select('id, type, trigger_type, subject, segment, status, scheduled_at, sent_at, created_at, test_sent_at')
    .order('created_at', { ascending: false })

  const queue = (campaigns ?? []).filter(c => ['draft', 'ready'].includes(c.status))
  const scheduled = (campaigns ?? []).filter(c => c.status === 'scheduled')
  const sent = (campaigns ?? []).filter(c => c.status === 'sent')

  // Fetch open/click stats for sent campaigns
  const sentIds = sent.map(c => c.id)
  const statsMap = new Map<string, { total: number; opened: number; clicked: number }>()
  if (sentIds.length > 0) {
    const service = createServiceClient()
    const { data: sends } = await service
      .from('email_sends')
      .select('campaign_id, opened_at, clicked_at')
      .in('campaign_id', sentIds)
    for (const s of sends ?? []) {
      const existing = statsMap.get(s.campaign_id) ?? { total: 0, opened: 0, clicked: 0 }
      statsMap.set(s.campaign_id, {
        total: existing.total + 1,
        opened: existing.opened + (s.opened_at ? 1 : 0),
        clicked: existing.clicked + (s.clicked_at ? 1 : 0),
      })
    }
  }

  const tabs = [
    { key: 'queue', label: 'Queue', count: queue.length, items: queue },
    { key: 'scheduled', label: 'Scheduled', count: scheduled.length, items: scheduled },
    { key: 'sent', label: 'Sent', count: sent.length, items: sent },
  ]
  const activeTab = tabs.find(t => t.key === tab) ?? tabs[0]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="app-heading text-2xl">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage and approve outgoing emails</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/email/settings" className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors">
            Settings
          </Link>
          <Link href="/admin/email/compose" className="flex items-center gap-1.5 text-xs font-medium bg-[#e8560a] hover:bg-[#d04e09] text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} /> Compose
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/admin/email?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-[#e8560a] text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-2 text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{t.count}</span>
            )}
          </Link>
        ))}
      </div>

      {activeTab.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Send size={36} className="text-zinc-700 mb-4" />
          <p className="font-medium text-zinc-400">Nothing here</p>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === 'queue' ? 'Auto-drafts will appear here when content is published' : `No ${tab} campaigns`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeTab.items.map(campaign => {
            const badge = STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft
            const triggerLabel = campaign.type === 'admin_composed'
              ? 'Admin composed'
              : `Auto — ${TRIGGER_LABELS[campaign.trigger_type] ?? campaign.trigger_type}`
            return (
              <Link
                key={campaign.id}
                href={`/admin/email/${campaign.id}`}
                className="flex items-start justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-zinc-600">{triggerLabel}</span>
                    {campaign.status === 'ready' && !campaign.test_sent_at && (
                      <span className="flex items-center gap-1 text-xs text-amber-500">
                        <AlertCircle size={11} /> Test send required
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {campaign.subject || <span className="italic text-zinc-600">No subject yet</span>}
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Segment: {campaign.segment}
                    {campaign.scheduled_at && ` · Scheduled: ${new Date(campaign.scheduled_at).toLocaleString('en-GB')}`}
                    {campaign.sent_at && ` · Sent: ${new Date(campaign.sent_at).toLocaleString('en-GB')}`}
                  </p>
                  {campaign.status === 'sent' && (() => {
                    const stats = statsMap.get(campaign.id)
                    if (!stats || stats.total === 0) return null
                    const openPct = Math.round((stats.opened / stats.total) * 100)
                    const clickPct = Math.round((stats.clicked / stats.total) * 100)
                    return (
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MailOpen size={11} className="text-emerald-500" />
                          <span className="text-emerald-400 font-medium">{openPct}%</span> opened
                          <span className="text-zinc-700 mx-1">·</span>
                          {stats.opened}/{stats.total}
                        </span>
                        {stats.clicked > 0 && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <MousePointerClick size={11} className="text-sky-500" />
                            <span className="text-sky-400 font-medium">{clickPct}%</span> clicked
                          </span>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <FileText size={16} className="text-zinc-600 flex-shrink-0 mt-1" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
