import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe, getPlanKeyByPriceId } from '@/lib/stripe'
import { createStorageAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or configuration' }, { status: 400 })
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    const supabase = createStorageAdminClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const academyId = session.metadata?.academy_id
        const planType = session.metadata?.plan_type

        if (academyId && session.subscription) {
          const subscriptionId = session.subscription as string
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const trialEndsAt = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString() 
            : null

          const { error } = await supabase
            .from('academies')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              subscription_status: subscription.status,
              plan: planType || null,
              trial_ends_at: trialEndsAt,
            })
            .eq('id', academyId)

          if (error) {
            console.error('Error updating academy in checkout.session.completed:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const priceId = subscription.items.data[0]?.price.id
        const planType = priceId ? getPlanKeyByPriceId(priceId) : undefined
        const trialEndsAt = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null

        const { error } = await supabase
          .from('academies')
          .update({
            subscription_status: subscription.status,
            ...(planType ? { plan: planType } : {}),
            trial_ends_at: trialEndsAt,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating academy in customer.subscription.updated:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { error } = await supabase
          .from('academies')
          .update({
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            plan: null,
            trial_ends_at: null,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('Error updating academy in customer.subscription.deleted:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as { subscription?: string | null }
        if (invoice.subscription) {
          const { error } = await supabase
            .from('academies')
            .update({
              subscription_status: 'active',
            })
            .eq('stripe_subscription_id', invoice.subscription)

          if (error) {
            console.error('Error updating academy in invoice.payment_succeeded:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string | null }
        if (invoice.subscription) {
          const { error } = await supabase
            .from('academies')
            .update({
              subscription_status: 'past_due',
            })
            .eq('stripe_subscription_id', invoice.subscription)

          if (error) {
            console.error('Error updating academy in invoice.payment_failed:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook Error processing: ${errorMessage}`)
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }
}
