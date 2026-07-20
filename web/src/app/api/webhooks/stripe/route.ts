import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe'
import { sendSubscriptionConfirmationEmail, sendVideoAnalysisRequestEmail, sendPurchaseConfirmationEmail } from '@/lib/email'
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

  const supabase = createServiceClient()

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

          // Send confirmation email to club creator on new subscription
          if (isActive && event.type === 'customer.subscription.created') {
            const { data: club } = await supabase
              .from('clubs')
              .select('created_by')
              .eq('stripe_customer_id', sub.customer as string)
              .single()
            if (club?.created_by) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, username')
                .eq('id', club.created_by)
                .single()
              const { data: authUser } = await supabase.auth.admin.getUserById(club.created_by)
              const email = authUser?.user?.email
              if (email) {
                await sendSubscriptionConfirmationEmail(
                  email,
                  profile?.display_name ?? profile?.username ?? 'Coach',
                  'club',
                )
              }
            }
          }
        } else if (userId) {
          await supabase
            .from('profiles')
            .update({
              subscription_tier: isActive ? 'coach' : 'free',
              stripe_subscription_id: sub.id,
            })
            .eq('id', userId)

          // Send confirmation email on new subscription
          if (isActive && event.type === 'customer.subscription.created') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', userId)
              .single()
            const { data: authUser } = await supabase.auth.admin.getUserById(userId)
            const email = authUser?.user?.email
            if (email) {
              await sendSubscriptionConfirmationEmail(
                email,
                profile?.display_name ?? profile?.username ?? 'Coach',
                'coach',
              )
            }
          }
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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.metadata?.type === 'product') {
          const productId = session.metadata.product_id
          const userId = session.metadata.user_id || null
          const guestEmail = !userId ? session.customer_details?.email ?? null : null

          if (productId && (userId || guestEmail)) {
            // Idempotent — Stripe may redeliver the same event.
            await supabase.from('purchases').upsert(
              {
                user_id: userId,
                guest_email: guestEmail,
                product_id: productId,
                stripe_checkout_session_id: session.id,
                stripe_payment_intent_id:
                  typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
                amount_paid_cents: session.amount_total ?? 0,
              },
              { onConflict: 'stripe_checkout_session_id', ignoreDuplicates: true },
            )

            const { data: product } = await supabase
              .from('products')
              .select('title, storage_path')
              .eq('id', productId)
              .single()

            if (product) {
              if (guestEmail) {
                const { data: signedUrl } = await supabase.storage
                  .from('shop-assets')
                  .createSignedUrl(product.storage_path, 60 * 60 * 24 * 7)
                if (signedUrl) {
                  await sendPurchaseConfirmationEmail(guestEmail, {
                    productTitle: product.title,
                    downloadUrl: signedUrl.signedUrl,
                  })
                }
              } else if (userId) {
                const { data: authUser } = await supabase.auth.admin.getUserById(userId)
                const email = authUser?.user?.email
                if (email) {
                  await sendPurchaseConfirmationEmail(email, {
                    productTitle: product.title,
                    downloadUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://18thman.app'}/shop/library`,
                  })
                }
              }
            }
          }
          break
        }

        if (session.metadata?.type !== 'analysis') break

        const m = session.metadata
        const serviceType = m.service_type as 'match-review' | 'opposition-scouting'
        const turnaround = m.turnaround as 'standard' | 'express'
        const amountPaid = session.amount_total ? session.amount_total / 100 : 0

        const coachEmail = m.coach_email || session.customer_details?.email || ''
        const notifyEmail = process.env.ANALYSIS_NOTIFY_EMAIL ?? 'nick.johnsonn@gmail.com'
        await sendVideoAnalysisRequestEmail(notifyEmail, {
          coachName: m.coach_name || session.customer_details?.name || 'Unknown',
          coachEmail,
          serviceType,
          turnaround,
          subject: m.subject ?? '',
          matchDate: m.match_date ?? '',
          opposition: m.opposition ?? '',
          competition: m.competition ?? '',
          videoLink: m.video_link ?? '',
          notes: m.notes ?? '',
          subscriptionTier: 'paid',
          price: amountPaid,
          memberDiscount: amountPaid < (serviceType === 'match-review' ? (turnaround === 'express' ? 80 : 50) : (turnaround === 'express' ? 110 : 75)),
        })
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
