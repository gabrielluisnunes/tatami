import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2024-04-10' as any,
})

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

    // Handle the webhook event
    switch (event.type) {
      case 'invoice.payment_succeeded':
        // Handle successful payment
        break;
      case 'customer.subscription.deleted':
        // Handle deleted subscription
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true, type: event.type })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }
}
