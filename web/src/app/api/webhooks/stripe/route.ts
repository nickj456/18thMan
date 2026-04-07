import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const clubId = sub.metadata?.club_id
        const userId = sub.metadata?.user_id

        if (clubId) {
          await supabase
            .from('clubs')
            .update({
              subscription_tier: isActive ? 'club' : 'free',
              stripe_subscription_id: sub.id,
            })
            .eq('stripe_customer_id', sub.customer as string)
        } else if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: isActive ? 'coach' : 'free',
              stripe_subscription_id: sub.id,
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const clubId = sub.metadata?.club_id
        const userId = sub.metadata?.user_id

        if (clubId) {
          await supabase
            .from('clubs')
            .update({ subscription_tier: 'free', stripe_subscription_id: null })
            .eq('stripe_customer_id', sub.customer as string)
        } else if (userId) {
          await supabase
            .from('profiles')
            .update({ subscription_tier: 'free', stripe_subscription_id: null })
            .eq('id', userId)
        }
        break
      }

      case 'invoice.payment_failed': {
        // Log for now — could send an email here in future
        const invoice = event.data.object as Stripe.Invoice
        console.warn('[stripe/webhook] payment failed for customer:', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
