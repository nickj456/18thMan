'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendCampaign } from '@/lib/email-campaigns'
import { sendCampaignEmailHtml } from '@/lib/email'
import { generateUnsubscribeToken } from '@/lib/email-notifications'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')
  return { supabase, user }
}

export async function updateCampaign(campaignId: string, data: {
  subject?: string
  body_html?: string
  cta_label?: string | null
  cta_url?: string | null
  segment?: string
  scheduled_at?: string | null
}): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ ...data })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}

export async function sendTestEmail(campaignId: string, toEmail: string): Promise<{ error?: string }> {
  const { supabase, user } = await assertAdmin()
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('subject, body_html, cta_label, cta_url, trigger_type')
    .eq('id', campaignId)
    .single()
  if (!campaign) return { error: 'Campaign not found' }

  const category = campaign.trigger_type === 'announcement' || campaign.trigger_type === 'poll'
    ? 'announcement'
    : campaign.trigger_type
  const unsubToken = generateUnsubscribeToken(user.id, category)

  // Note: CampaignEmailParams does NOT have userId field
  const result = await sendCampaignEmailHtml(toEmail, {
    subject: `[TEST] ${campaign.subject}`,
    bodyHtml: campaign.body_html,
    ctaLabel: campaign.cta_label ?? undefined,
    ctaUrl: campaign.cta_url ?? undefined,
    category,
    unsubToken,
  })

  if (!result.success) return { error: result.error }

  await supabase
    .from('email_campaigns')
    .update({ test_sent_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}

export async function approveCampaignNow(campaignId: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  // Verify test was sent server-side
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('test_sent_at')
    .eq('id', campaignId)
    .single()
  if (!campaign?.test_sent_at) return { error: 'You must send a test email before approving this campaign.' }

  const { sent, errors } = await sendCampaign(campaignId)
  if (sent === 0 && errors > 0) {
    return { error: `Campaign send failed — ${errors} error(s), 0 emails delivered.` }
  }
  console.log(`[approveCampaignNow] sent: ${sent}, errors: ${errors}`)
  revalidatePath('/admin/email')
  redirect('/admin/email?tab=sent')
}

export async function scheduleCampaign(campaignId: string, scheduledAt: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  // Verify test was sent server-side
  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('test_sent_at')
    .eq('id', campaignId)
    .single()
  if (!campaign?.test_sent_at) return { error: 'You must send a test email before scheduling this campaign.' }

  const { error } = await supabase
    .from('email_campaigns')
    .update({ status: 'scheduled', scheduled_at: scheduledAt })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/admin/email')
  redirect('/admin/email?tab=scheduled')
}

export async function cancelCampaign(campaignId: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ status: 'cancelled' })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath('/admin/email')
  return {}
}

export interface EmailAttachment {
  type: 'file' | 'session_plan'
  url: string
  filename: string
}

export async function updateCampaignAttachments(
  campaignId: string,
  attachments: EmailAttachment[],
): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .update({ attachments })
    .eq('id', campaignId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/email/${campaignId}`)
  return {}
}

export async function deleteCampaign(campaignId: string): Promise<{ error?: string }> {
  const { supabase } = await assertAdmin()
  const { error } = await supabase
    .from('email_campaigns')
    .delete()
    .eq('id', campaignId)
  if (error) return { error: error.message }
  redirect('/admin/email')
}

export async function createAdminComposedCampaign(data: {
  subject: string
  body_html: string
  cta_label?: string
  cta_url?: string
  segment: string
}): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await assertAdmin()
  const { data: campaign, error } = await supabase
    .from('email_campaigns')
    .insert({
      type: 'admin_composed',
      trigger_type: 'announcement',
      subject: data.subject,
      body_html: data.body_html,
      cta_label: data.cta_label ?? null,
      cta_url: data.cta_url ?? null,
      segment: data.segment,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: campaign.id }
}

export async function saveEmailSystemSettings(data: {
  burst_threshold: number
  burst_window_minutes: number
  batch_threshold_drill: number
  batch_threshold_podcast: number
  batch_threshold_wellbeing: number
}): Promise<{ error?: string }> {
  await assertAdmin()
  const service = createServiceClient()
  const { error } = await service
    .from('email_settings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .not('id', 'is', null)
  if (error) return { error: error.message }
  revalidatePath('/admin/email/settings')
  return {}
}
