/**
 * @jest-environment node
 */
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { getChargeForStudentPayment } from '@/lib/services/financials.service'
import { rateLimiters } from '@/lib/rate-limit'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/rate-limit', () => ({
  getIp: jest.fn(() => '127.0.0.1'),
  rateLimiters: {
    strict: { limit: jest.fn().mockResolvedValue({ success: true }) },
    default: { limit: jest.fn() },
    heavy: { limit: jest.fn().mockResolvedValue({ success: true }) },
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createStorageAdminClient: jest.fn(),
}))

jest.mock('@/lib/services/financials.service', () => ({
  getChargeForStudentPayment: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>
const getChargeMock = getChargeForStudentPayment as jest.MockedFunction<
  typeof getChargeForStudentPayment
>
const defaultLimit = rateLimiters.default.limit as jest.Mock

function mockAluno(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null; full_name: string } | null
  academy?: { name: string; pix_key: string | null; pix_key_type: string | null } | null
}) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: IDS.student } : opts.user },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
        }),
      }),
    }),
  } as never)

  createStorageAdminClientMock.mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: opts.academy ?? null,
          }),
        }),
      }),
    }),
  } as never)
}

describe('GET /api/financials/pix/[id]', () => {
  let GET: typeof import('@/app/api/financials/pix/[id]/route').GET

  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/financials/pix/[id]/route'))
  })

  beforeEach(() => {
    defaultLimit.mockResolvedValue({ success: true })
  })

  it('retorna 401 sem usuário', async () => {
    mockAluno({ user: null })

    const res = await GET(
      new Request('http://localhost/api/financials/pix/x'),
      { params: { id: IDS.financial } },
    )

    expect(res.status).toBe(401)
  })

  it('retorna 403 se não for aluno', async () => {
    mockAluno({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy, full_name: 'Admin' },
    })

    const res = await GET(
      new Request('http://localhost/api/financials/pix/x'),
      { params: { id: IDS.financial } },
    )

    expect(res.status).toBe(403)
  })

  it('retorna 404 se cobrança não existe', async () => {
    mockAluno({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy, full_name: 'Aluno' },
    })
    getChargeMock.mockResolvedValue({ ok: false, error: 'not_found' })

    const res = await GET(
      new Request('http://localhost/api/financials/pix/x'),
      { params: { id: IDS.financial } },
    )

    expect(res.status).toBe(404)
  })

  it('retorna 400 se academia sem chave PIX', async () => {
    mockAluno({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy, full_name: 'Aluno' },
      academy: { name: 'Dojo', pix_key: null, pix_key_type: null },
    })
    getChargeMock.mockResolvedValue({
      ok: true,
      financial: {
        id: IDS.financial,
        amount: 175,
        due_date: '2026-08-01',
        status: 'pending',
        student_id: IDS.student,
      },
    })

    const res = await GET(
      new Request('http://localhost/api/financials/pix/x'),
      { params: { id: IDS.financial } },
    )

    expect(res.status).toBe(400)
  })

  it('retorna payload PIX no sucesso', async () => {
    mockAluno({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy, full_name: 'Aluno' },
      academy: { name: 'Dojo Tatami', pix_key: 'email@pix.com', pix_key_type: 'email' },
    })
    getChargeMock.mockResolvedValue({
      ok: true,
      financial: {
        id: IDS.financial,
        amount: 175,
        due_date: '2026-08-01',
        status: 'pending',
        student_id: IDS.student,
      },
    })

    const res = await GET(
      new Request('http://localhost/api/financials/pix/x'),
      { params: { id: IDS.financial } },
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.pix_payload).toEqual(expect.any(String))
    expect(json.amount).toBe(175)
    expect(json.academy_name).toBe('Dojo Tatami')
  })
})
