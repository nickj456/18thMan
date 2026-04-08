import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe, getPriceId, type CheckoutPlan } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan, clubId } = await req.json() as { plan: CheckoutPlan; clubId?: string }

    const priceId = getPriceId(plan)
    console.log('[stripe/checkout] priceId:', priceId, 'plan:', plan)
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const isClubPlan = plan.startsWith('club')

    // Club plans require a club
    if (isClubPlan && !clubId) {
      return NextResponse.json({ error: 'Club ID required for club plans' }, { status: 400 })
    }

    const stripe = getStripe()
    const serviceClient = createServiceClient()
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    if (isClubPlan) {
      // Club plan — customer is the club
      const { data: club } = await serviceClient
        .from('clubs')
        .select('id, name, stripe_customer_id')
        .eq('id', clubId)
        .single()

      if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

      let customerId = club.stripe_customer_id
      if (!customerId) {
        const customer = await stripe.customers.create({
          name: club.name,
          metadata: { club_id: club.id },
        })
        customerId = customer.id
        await serviceClient.from('clubs').update({ stripe_customer_id: customerId }).eq('id', club.id)
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { club_id: club.id, plan },
        subscription_data: { metadata: { club_id: club.id, plan } },
        success_url: `${origin}/settings?upgraded=club`,
        cancel_url: `${origin}/pricing`,
      })

      return NextResponse.json({ url: session.url })
    } else {
      // Coach Pro plan — customer is the individual user
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('display_name, stripe_customer_id')
        .eq('id', user.id)
        .single()

      let customerId = profile?.stripe_customer_id
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.display_name ?? undefined,
          metadata: { user_id: user.id },
        })
        customerId = customer.id
        await serviceClient.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { user_id: user.id, plan },
        subscription_data: { metadata: { user_id: user.id, plan } },
        success_url: `${origin}/settings?upgraded=coach`,
        cancel_url: `${origin}/pricing`,
      })

      return NextResponse.json({ url: session.url })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[stripe/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
