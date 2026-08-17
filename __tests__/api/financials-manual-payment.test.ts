/**
 * @jest-environment node
 */
import { POST } from '@/app/api/financials/manual-payment/route'
import { createClient } from '@/lib/supabase/server'
import { registerManualPayment } from '@/lib/services/financials.service'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/services/financials.service', () => ({
  registerManualPayment: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const registerManualPaymentMock = registerManualPayment as jest.MockedFunction<
  typeof registerManualPayment
>

const STUDENT_ID = '550e8400-e29b-41d4-a716-446655440001'

function mockSupabase(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
  student?: { id: string; academy_id: string } | null
}) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: 'admin-1' } : opts.user },
      }),
    },
    from: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockImplementation((_col: string, val: string) => {
          // primeira chamada: profile do admin (eq id)
          // segunda: aluno (eq id) + eq academy_id → single
          if (val === 'admin-1' || (opts.user && val === opts.user.id)) {
            return {
              single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: opts.student ?? null }),
              }),
            }
          }
          return {
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: opts.student ?? null }),
            }),
            single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
          }
        }),
      }),
    })),
  } as never)
}

describe('POST /api/financials/manual-payment', () => {
  it('retorna 401 sem usuário', async () => {
    mockSupabase({ user: null })

    const res = await POST(
      new Request('http://localhost/api/financials/manual-payment', {
        method: 'POST',
        body: JSON.stringify({
          student_id: STUDENT_ID,
          amount: 175,
          paid_at: '2026-08-16T12:00:00.000Z',
        }),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 404 se aluno não pertence à academia', async () => {
    mockSupabase({
      user: { id: 'admin-1' },
      profile: { role: 'admin', academy_id: 'ac-1' },
      student: null,
    })

    const res = await POST(
      new Request('http://localhost/api/financials/manual-payment', {
        method: 'POST',
        body: JSON.stringify({
          student_id: STUDENT_ID,
          amount: 175,
          paid_at: '2026-08-16T12:00:00.000Z',
        }),
      }),
    )

    expect(res.status).toBe(404)
  })

  it('retorna 200 quando o service registra o pagamento', async () => {
    mockSupabase({
      user: { id: 'admin-1' },
      profile: { role: 'admin', academy_id: 'ac-1' },
      student: { id: STUDENT_ID, academy_id: 'ac-1' },
    })
    registerManualPaymentMock.mockResolvedValue({ ok: true, mode: 'updated' })

    const res = await POST(
      new Request('http://localhost/api/financials/manual-payment', {
        method: 'POST',
        body: JSON.stringify({
          student_id: STUDENT_ID,
          amount: 175,
          paid_at: '2026-08-16T12:00:00.000Z',
        }),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
