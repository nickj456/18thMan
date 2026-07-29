import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { productId } = await req.json().catch(() => ({})) as { productId?: string }
    if (!productId) return NextResponse.json({ error: 'Invalid product' }, { status: 400 })

    const serviceClient = createServiceClient()
    const { data: product } = await serviceClient
      .from('products')
      .select('id, slug, title, price_cents, stripe_price_id, is_published')
      .eq('id', productId)
      .single()

    if (!product || !product.is_published) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    if (product.price_cents === null) {
      return NextResponse.json({ error: 'Product is not available for individual purchase' }, { status: 400 })
    }

    const stripe = getStripe()

    let customerId: string | undefined
    if (user) {
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('display_name, stripe_customer_id')
        .eq('id', user.id)
        .single()

      customerId = profile?.stripe_customer_id ?? undefined
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: profile?.display_name ?? undefined,
          metadata: { user_id: user.id },
        })
        customerId = customer.id
        await serviceClient.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
      }
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const lineItem = product.stripe_price_id
      ? { price: product.stripe_price_id, quantity: 1 }
      : {
          price_data: {
            currency: 'gbp',
            product_data: { name: product.title },
            unit_amount: product.price_cents,
          },
          quantity: 1,
        }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [lineItem],
      metadata: { type: 'product', product_id: product.id, user_id: user?.id ?? '' },
      success_url: `${origin}/shop/${product.slug}?purchased=1`,
      cancel_url: `${origin}/shop/${product.slug}`,
      // Guests get no `customer` — Stripe collects their email itself and
      // still creates a lightweight Customer object so the webhook can read
      // it back via session.customer_details.
      ...(customerId ? { customer: customerId } : { customer_creation: 'always' }),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/shop-checkout]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
