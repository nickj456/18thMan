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

export function getPriceId(plan: CheckoutPlan): string {
  const [product, billing] = plan.split('_') as ['coach' | 'club', 'monthly' | 'annual']
  return STRIPE_PRICES[product][billing]
}
