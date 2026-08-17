/**
 * @jest-environment node
 */
import { POST } from '@/app/api/financials/mark-paid/route'
import { createClient } from '@/lib/supabase/server'
import { markAsPaid } from '@/lib/services/financials.service'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/services/financials.service', () => ({
  markAsPaid: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const markAsPaidMock = markAsPaid as jest.MockedFunction<typeof markAsPaid>

const FINANCIAL_ID = '550e8400-e29b-41d4-a716-446655440000'

function mockSupabase(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
}) {
  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
      }),
    }),
  })

  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: 'admin-1' } : opts.user },
      }),
    },
    from,
  } as never)
}

describe('POST /api/financials/mark-paid', () => {
  it('retorna 401 sem usuário', async () => {
    mockSupabase({ user: null })

    const res = await POST(
      new Request('http://localhost/api/financials/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ financial_id: FINANCIAL_ID }),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 403 se não for admin', async () => {
    mockSupabase({
      user: { id: 'u-1' },
      profile: { role: 'aluno', academy_id: 'ac-1' },
    })

    const res = await POST(
      new Request('http://localhost/api/financials/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ financial_id: FINANCIAL_ID }),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('retorna 400 com body inválido', async () => {
    mockSupabase({
      user: { id: 'u-1' },
      profile: { role: 'admin', academy_id: 'ac-1' },
    })

    const res = await POST(
      new Request('http://localhost/api/financials/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ financial_id: 'nao-uuid' }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 409 quando já está pago', async () => {
    mockSupabase({
      user: { id: 'u-1' },
      profile: { role: 'admin', academy_id: 'ac-1' },
    })
    markAsPaidMock.mockResolvedValue({ ok: false, error: 'already_paid' })

    const res = await POST(
      new Request('http://localhost/api/financials/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ financial_id: FINANCIAL_ID }),
      }),
    )

    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toEqual({ error: 'Já marcado como pago' })
  })

  it('retorna 200 no sucesso', async () => {
    mockSupabase({
      user: { id: 'u-1' },
      profile: { role: 'admin', academy_id: 'ac-1' },
    })
    markAsPaidMock.mockResolvedValue({ ok: true })

    const res = await POST(
      new Request('http://localhost/api/financials/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ financial_id: FINANCIAL_ID }),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(markAsPaidMock).toHaveBeenCalledWith(
      expect.anything(),
      FINANCIAL_ID,
      'ac-1',
    )
  })
})
