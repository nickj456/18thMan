import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { CampaignApproveForm } from './CampaignApproveForm'

export default async function AdminEmailCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (!campaign) redirect('/admin/email')

  const { data: items } = await supabase
    .from('email_campaign_items')
    .select('item_title, item_url, item_type')
    .eq('campaign_id', id)

  // Smart schedule suggestion: next Tuesday 9am UTC
  const now = new Date()
  const daysUntilTuesday = (2 - now.getUTCDay() + 7) % 7 || 7
  const suggested = new Date(now)
  suggested.setUTCDate(now.getUTCDate() + daysUntilTuesday)
  suggested.setUTCHours(9, 0, 0, 0)
  const suggestedIso = suggested.toISOString().slice(0, 16)

  // Get admin's email for test sends
  const service = createServiceClient()
  const { data: authUser } = await service.auth.admin.getUserById(user.id)
  const adminEmail = authUser?.user?.email ?? ''

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/email" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="app-heading text-2xl">Review Campaign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaign.type === 'auto_draft' ? `Auto-generated · ${campaign.trigger_type.replace(/_/g, ' ')}` : 'Admin composed'}
          </p>
        </div>
      </div>

      {campaign.status === 'ready' && !campaign.test_sent_at && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
          <AlertCircle size={16} />
          You must send a test email before you can approve this campaign.
        </div>
      )}
      {campaign.test_sent_at && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle size={16} />
          Test sent at {new Date(campaign.test_sent_at).toLocaleString('en-GB')} — approve button is unlocked.
        </div>
      )}

      {items && items.length > 0 && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Batched items ({items.length})</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-xs text-zinc-600 capitalize">{item.item_type}</span>
              <a href={item.item_url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-[#e8560a] transition-colors">
                {item.item_title}
              </a>
            </div>
          ))}
        </div>
      )}

      <CampaignApproveForm
        campaign={campaign}
        adminEmail={adminEmail}
        suggestedSchedule={suggestedIso}
      />
    </div>
  )
}
