import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe, getPriceId, type CheckoutPlan } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await req.json() as { plan: CheckoutPlan }
    if (!plan.startsWith('club')) {
      return NextResponse.json({ error: 'Invalid plan for club checkout' }, { status: 400 })
    }

    const priceId = getPriceId(plan)
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const serviceClient = createServiceClient()
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    // Get user profile
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('display_name, club_id')
      .eq('id', user.id)
      .single()

    let clubId = profile?.club_id

    // Create a placeholder club if user doesn't have one
    if (!clubId) {
      const slug = `club-${user.id.slice(0, 8)}-${Date.now()}`
      const { data: newClub, error: clubError } = await serviceClient
        .from('clubs')
        .insert({ name: 'My Club', slug, created_by: user.id })
        .select('id')
        .single()

      if (clubError || !newClub) {
        console.error('[club-checkout] Failed to create club:', clubError)
        return NextResponse.json({ error: 'Failed to create club' }, { status: 500 })
      }

      clubId = newClub.id

      // Link club to user's profile
      await serviceClient
        .from('profiles')
        .update({ club_id: clubId })
        .eq('id', user.id)
    }

    // Get or create Stripe customer for the club
    const { data: club } = await serviceClient
      .from('clubs')
      .select('id, name, stripe_customer_id')
      .eq('id', clubId)
      .single()

    if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 })

    const stripe = getStripe()
    let customerId = club.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: club.name,
        email: user.email,
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
      success_url: `${origin}/clubs/setup?clubId=${club.id}&upgraded=true`,
      cancel_url: `${origin}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[club-checkout]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
