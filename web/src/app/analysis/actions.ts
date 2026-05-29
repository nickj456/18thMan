'use server'

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

const PRICE_IDS: Record<string, string> = {
  'match-review-standard': process.env.STRIPE_ANALYSIS_INDIVIDUAL_STANDARD_PRICE_ID || 'price_1TORk1Jw8I8hTNrBj1T2UpSV',
  'match-review-express': process.env.STRIPE_ANALYSIS_INDIVIDUAL_EXPRESS_PRICE_ID || 'price_1TORk2Jw8I8hTNrB3QpWZedn',
  'opposition-scouting-standard': process.env.STRIPE_ANALYSIS_SCOUTING_STANDARD_PRICE_ID || 'price_1TORk3Jw8I8hTNrBW2miZaE0',
  'opposition-scouting-express': process.env.STRIPE_ANALYSIS_SCOUTING_EXPRESS_PRICE_ID || 'price_1TORk4Jw8I8hTNrBDIsdRZVl',
}

export async function submitAnalysisRequest(
  formData: FormData,
): Promise<{ checkoutUrl?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isMember = false
  let coachName = ''
  let coachEmail = ''

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, subscription_tier')
      .eq('id', user.id)
      .single()
    isMember = !!(profile?.subscription_tier && profile.subscription_tier !== 'free')
    coachName = (profile?.display_name ?? user.email ?? '').slice(0, 490)
    coachEmail = (user.email ?? '').slice(0, 490)
  }

  const serviceType = formData.get('serviceType') as string
  const turnaround = formData.get('turnaround') as string
  const subject = (formData.get('subject') as string)?.trim()
  const matchDate = (formData.get('matchDate') as string)?.trim()
  const opposition = (formData.get('opposition') as string)?.trim()
  const competition = (formData.get('competition') as string)?.trim()
  const videoLink = (formData.get('videoLink') as string)?.trim()
  const notes = ((formData.get('notes') as string) ?? '').trim()

  if (!serviceType || !turnaround || !subject || !matchDate || !opposition || !competition || !videoLink) {
    return { error: 'Please fill in all required fields.' }
  }

  const priceId = PRICE_IDS[`${serviceType}-${turnaround}`]
  if (!priceId) return { error: 'Invalid service selection.' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: priceId, quantity: 1 }],
    ...(isMember ? { discounts: [{ coupon: '18THMAN_MEMBER' }] } : {}),
    ...(coachEmail ? { customer_email: coachEmail } : {}),
    metadata: {
      type: 'analysis',
      service_type: serviceType,
      turnaround,
      subject,
      match_date: matchDate,
      opposition,
      competition,
      video_link: videoLink.slice(0, 490),
      notes: notes.slice(0, 490),
      user_id: user?.id ?? '',
      coach_name: coachName,
      coach_email: coachEmail,
    },
    success_url: `${siteUrl}/analysis?paid=1`,
    cancel_url: `${siteUrl}/analysis`,
  })

  return { checkoutUrl: session.url ?? undefined }
}
