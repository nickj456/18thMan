'use server'

import { createClient } from '@/lib/supabase/server'
import { sendVideoAnalysisRequestEmail } from '@/lib/email'

const PRICES = {
  'match-review-standard': 50,
  'match-review-express': 80,
  'opposition-scouting-standard': 75,
  'opposition-scouting-express': 110,
} as const

type PriceKey = keyof typeof PRICES

export async function submitAnalysisRequest(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const serviceType = formData.get('serviceType') as 'match-review' | 'opposition-scouting'
  const turnaround = formData.get('turnaround') as 'standard' | 'express'
  const subject = (formData.get('subject') as string)?.trim()
  const matchDate = (formData.get('matchDate') as string)?.trim()
  const opposition = (formData.get('opposition') as string)?.trim()
  const competition = (formData.get('competition') as string)?.trim()
  const videoLink = (formData.get('videoLink') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim() ?? ''

  if (!serviceType || !turnaround || !subject || !matchDate || !opposition || !competition || !videoLink) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  const priceKey = `${serviceType}-${turnaround}` as PriceKey
  const basePrice = PRICES[priceKey]
  const isMember = profile?.subscription_tier && profile.subscription_tier !== 'free'
  const price = isMember ? basePrice - 10 : basePrice

  const notifyEmail = process.env.ANALYSIS_NOTIFY_EMAIL ?? 'nick.johnsonn@gmail.com'

  const result = await sendVideoAnalysisRequestEmail(notifyEmail, {
    coachName: profile?.display_name ?? user.email ?? 'Unknown',
    coachEmail: user.email ?? '',
    serviceType,
    turnaround,
    subject,
    matchDate,
    opposition,
    competition,
    videoLink,
    notes,
    subscriptionTier: profile?.subscription_tier ?? 'free',
    price,
    memberDiscount: !!isMember,
  })

  if (!result.success) return { success: false, error: 'Failed to send request. Please try again.' }
  return { success: true }
}
