import Stripe from 'stripe'
import { env } from './env'

if (!env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not defined in environment variables.')
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: '2024-04-10' as any,
})

export const PLANS = {
  starter: {
    name: 'Starter',
    priceId: 'price_1TkFdjJFm0PQ5umULNEvHO9t',
    price: 79,
  },
  pro: {
    name: 'Pro',
    priceId: 'price_1TkFeqJFm0PQ5umUgGuwHsxK',
    price: 175,
  },
  'multi-unit': {
    name: 'Multi-unit',
    priceId: 'price_1TkFfOJFm0PQ5umUgHBYJDvM',
    price: 299,
  },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanKeyByPriceId(priceId: string): PlanKey | undefined {
  return Object.keys(PLANS).find(
    (key) => PLANS[key as PlanKey].priceId === priceId
  ) as PlanKey | undefined
}
