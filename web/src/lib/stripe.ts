import Stripe from 'stripe'

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set')
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export const STRIPE_PRICES = {
  coach: {
    monthly: process.env.STRIPE_COACH_MONTHLY_PRICE_ID ?? '',
    annual: process.env.STRIPE_COACH_ANNUAL_PRICE_ID ?? '',
  },
  club: {
    monthly: process.env.STRIPE_CLUB_MONTHLY_PRICE_ID ?? '',
    annual: process.env.STRIPE_CLUB_ANNUAL_PRICE_ID ?? '',
  },
} as const

export type CheckoutPlan = 'coach_monthly' | 'coach_annual' | 'club_monthly' | 'club_annual'

export function getPriceId(plan: string | undefined): string | null {
  // Defensive: `plan` arrives from an unvalidated request body. Unknown plans
  // (or unset env price IDs) must return null → 400, not throw → 500.
  const [product, billing] = (typeof plan === 'string' ? plan : '').split('_')
  const prices = STRIPE_PRICES as Record<string, Record<string, string> | undefined>
  return prices[product]?.[billing] || null
}
