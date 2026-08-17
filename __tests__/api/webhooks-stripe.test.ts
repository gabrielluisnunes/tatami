/**
 * @jest-environment node
 */
import { POST } from '@/app/api/webhooks/stripe/route'
import { stripe } from '@/lib/stripe'
import { createStorageAdminClient } from '@/lib/supabase/server'

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  },
  getPlanKeyByPriceId: jest.fn(),
}))

jest.mock('@/lib/supabase/server', () => ({
  createStorageAdminClient: jest.fn(),
}))

const constructEvent = stripe.webhooks.constructEvent as jest.Mock
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>

describe('POST /api/webhooks/stripe', () => {
  it('retorna 400 sem assinatura', async () => {
    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 400 se constructEvent falhar', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'bad' },
        body: '{}',
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 200 e received para evento válido genérico', async () => {
    constructEvent.mockReturnValue({ type: 'ping', data: { object: {} } })
    createStorageAdminClientMock.mockReturnValue({ from: jest.fn() } as never)

    const res = await POST(
      new Request('http://localhost/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_test' },
        body: '{}',
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ received: true, type: 'ping' })
  })
})
