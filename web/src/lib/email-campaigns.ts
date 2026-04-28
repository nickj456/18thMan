import { createServiceClient } from '@/lib/supabase/service'
import { generateUnsubscribeToken } from '@/lib/email-notifications'
import { sendCampaignEmailHtml } from '@/lib/email'

export type TriggerType = 'new_public_drill' | 'weekly_focus' | 'podcast' | 'wellbeing' | 'announcement' | 'poll'
export type CampaignSegment = 'all' | 'coaches' | 'club_admins' | 'free' | 'pro'

const BATCH_TRIGGER_TYPES: TriggerType[] = ['new_public_drill', 'podcast', 'wellbeing']

export async function getBatchThreshold(triggerType: TriggerType): Promise<number> {
  const service = createServiceClient()
  const { data } = await service.from('email_settings').select('*').single()
  switch (triggerType) {
    case 'new_public_drill': return data?.batch_threshold_drill ?? 5
    case 'podcast': return data?.batch_threshold_podcast ?? 3
    case 'wellbeing': return data?.batch_threshold_wellbeing ?? 3
    default: return 1
  }
}

export async function createCampaignAutoDraft(
  triggerType: TriggerType,
  item: { id: string; title: string; url: string; itemType: 'drill' | 'podcast' | 'wellbeing' | 'weekly_focus' },
): Promise<void> {
  const service = createServiceClient()

  if (!BATCH_TRIGGER_TYPES.includes(triggerType)) {
    const { subject, bodyHtml } = generateAutoDraftContent(triggerType, [item])
    await service.from('email_campaigns').insert({
      type: 'auto_draft',
      trigger_type: triggerType,
      subject,
      body_html: bodyHtml,
      status: 'ready',
      segment: 'all',
    })
    return
  }

  const { data: existing } = await service
    .from('email_campaigns')
    .select('id')
    .eq('trigger_type', triggerType)
    .eq('type', 'auto_draft')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let campaignId: string

  if (existing) {
    campaignId = existing.id
  } else {
    const { data: newCampaign, error } = await service
      .from('email_campaigns')
      .insert({
        type: 'auto_draft',
        trigger_type: triggerType,
        subject: '',
        body_html: '',
        status: 'draft',
        segment: 'all',
      })
      .select('id')
      .single()

    if (error || !newCampaign) {
      console.error('[createCampaignAutoDraft] insert error:', error)
      return
    }
    campaignId = newCampaign.id
  }

  await service.from('email_campaign_items').insert({
    campaign_id: campaignId,
    item_type: item.itemType === 'weekly_focus' ? 'wellbeing' : item.itemType,
    item_id: item.id,
    item_title: item.title,
    item_url: item.url,
  })

  const { count } = await service
    .from('email_campaign_items')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  const threshold = await getBatchThreshold(triggerType)
  const itemCount = count ?? 0

  const { data: items } = await service
    .from('email_campaign_items')
    .select('item_title, item_url, item_type')
    .eq('campaign_id', campaignId)

  const { subject, bodyHtml } = generateAutoDraftContent(triggerType, items ?? [])

  if (itemCount >= threshold) {
    await service
      .from('email_campaigns')
      .update({ status: 'ready', subject, body_html: bodyHtml })
      .eq('id', campaignId)
  } else {
    await service
      .from('email_campaigns')
      .update({ subject, body_html: bodyHtml })
      .eq('id', campaignId)
  }
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateAutoDraftContent(
  triggerType: TriggerType,
  items: { item_title?: string; title?: string; item_url?: string; url?: string; item_type?: string }[],
): { subject: string; bodyHtml: string } {
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'

  switch (triggerType) {
    case 'new_public_drill': {
      const count = items.length
      const firstName = escapeHtml(items[0]?.item_title ?? items[0]?.title ?? 'New Drill')
      const subject = count === 1 ? `New drill: ${firstName}` : `${count} new drills added to 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${escapeHtml(i.item_url ?? i.url ?? SITE_URL)}" style="color:#e8560a;font-weight:600;font-size:14px;">${escapeHtml(i.item_title ?? i.title)}</a>
        </td></tr>`
      ).join('')
      return {
        subject,
        bodyHtml: `<p style="margin:0 0 16px;color:#a1a1aa;">New drill${count !== 1 ? 's have' : ' has'} been added to the 18th Man drill library.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">${listItems}</table>`,
      }
    }
    case 'weekly_focus': {
      const title = escapeHtml(items[0]?.item_title ?? items[0]?.title ?? "this week's focus")
      return {
        subject: `This week's coaching focus: ${title}`,
        bodyHtml: `<p style="margin:0 0 16px;color:#a1a1aa;">Your weekly coaching focus has been published: <strong style="color:#ffffff;">${title}</strong>. Head to the app to see the suggested drills and discussion.</p>`,
      }
    }
    case 'podcast': {
      const count = items.length
      const firstName = escapeHtml(items[0]?.item_title ?? items[0]?.title ?? 'New Episode')
      const subject = count === 1 ? `New podcast: ${firstName}` : `${count} new podcast episodes on 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${escapeHtml(i.item_url ?? i.url ?? SITE_URL)}" style="color:#e8560a;font-weight:600;font-size:14px;">${escapeHtml(i.item_title ?? i.title)}</a>
        </td></tr>`
      ).join('')
      return {
        subject,
        bodyHtml: `<p style="margin:0 0 16px;color:#a1a1aa;">New coaching podcast content is available.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">${listItems}</table>`,
      }
    }
    case 'wellbeing': {
      const count = items.length
      const firstName = escapeHtml(items[0]?.item_title ?? items[0]?.title ?? 'New Resource')
      const subject = count === 1 ? `New resource: ${firstName}` : `${count} new wellbeing resources on 18th Man`
      const listItems = items.map(i =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid #2a2a2a;">
          <a href="${escapeHtml(i.item_url ?? i.url ?? SITE_URL)}" style="color:#e8560a;font-weight:600;font-size:14px;">${escapeHtml(i.item_title ?? i.title)}</a>
        </td></tr>`
      ).join('')
      return {
        subject,
        bodyHtml: `<p style="margin:0 0 16px;color:#a1a1aa;">New wellbeing and coaching resources are available.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin:16px 0;">${listItems}</table>`,
      }
    }
    default:
      return { subject: 'Update from 18th Man', bodyHtml: '<p>Something new is waiting for you on 18th Man.</p>' }
  }
}

export async function sendCampaign(campaignId: string): Promise<{ sent: number; errors: number }> {
  const service = createServiceClient()

  const { data: campaign } = await service
    .from('email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .single()

  if (!campaign) return { sent: 0, errors: 0 }

  // Get recipient profiles based on segment.
  // club_admins: profiles with club_role = 'admin' (from migration 024_club_roles.sql —
  // club_role is a column on profiles, distinct from the platform `role` column).
  let profileIds: string[]

  if (campaign.segment === 'all') {
    const { data } = await service.from('profiles').select('id')
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  } else if (campaign.segment === 'coaches') {
    const { data } = await service.from('profiles').select('id').eq('role', 'coach')
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  } else if (campaign.segment === 'free') {
    const { data } = await service.from('profiles').select('id').is('subscription_tier', null)
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  } else if (campaign.segment === 'pro') {
    const { data } = await service.from('profiles').select('id').in('subscription_tier', ['coach', 'club'])
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  } else if (campaign.segment === 'club_admins') {
    // club_role column added in migration 024 — 'admin' means club admin (not platform admin)
    const { data } = await service.from('profiles').select('id').eq('club_role', 'admin')
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  } else {
    const { data } = await service.from('profiles').select('id')
    profileIds = (data ?? []).map((p: { id: string }) => p.id)
  }

  if (!profileIds.length) return { sent: 0, errors: 0 }

  const category = campaign.trigger_type === 'announcement' || campaign.trigger_type === 'poll'
    ? 'announcement'
    : campaign.trigger_type

  let sent = 0
  let errors = 0

  for (const profileId of profileIds) {
    const { data: pref } = await service
      .from('email_preferences')
      .select('enabled')
      .eq('user_id', profileId)
      .eq('category', category)
      .maybeSingle()
    if (pref?.enabled === false) continue

    const { data: authUser } = await service.auth.admin.getUserById(profileId)
    const email = authUser?.user?.email
    if (!email) continue

    const unsubToken = generateUnsubscribeToken(profileId, category)
    const result = await sendCampaignEmailHtml(email, {
      subject: campaign.subject,
      bodyHtml: campaign.body_html,
      ctaLabel: campaign.cta_label ?? undefined,
      ctaUrl: campaign.cta_url ?? undefined,
      category,
      unsubToken,
    })

    if (result.success) {
      await service.from('email_sends').insert({
        user_id: profileId,
        campaign_id: campaignId,
        category,
        resend_message_id: result.messageId ?? null,
      })
      sent++
    } else {
      errors++
      console.error('[sendCampaign] send error for', profileId, result.error)
    }
  }

  await service
    .from('email_campaigns')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', campaignId)

  return { sent, errors }
}
