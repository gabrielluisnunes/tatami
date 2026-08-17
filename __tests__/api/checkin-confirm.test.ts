/**
 * @jest-environment node
 */
import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from '@/lib/rate-limit'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/rate-limit', () => ({
  getIp: jest.fn(() => '127.0.0.1'),
  rateLimiters: {
    strict: { limit: jest.fn().mockResolvedValue({ success: true }) },
    default: { limit: jest.fn().mockResolvedValue({ success: true }) },
    heavy: { limit: jest.fn() },
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createStorageAdminClient: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const heavyLimit = rateLimiters.heavy.limit as jest.Mock

const body = {
  checkin_id: IDS.financial,
  students: [{ student_id: IDS.student, source: 'manual' as const }],
}

function mockAuth(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
}) {
  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: IDS.admin } : opts.user },
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
}

describe('POST /api/checkin/confirm', () => {
  let POST: typeof import('@/app/api/checkin/confirm/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/checkin/confirm/route'))
  })

  beforeEach(() => {
    heavyLimit.mockResolvedValue({ success: true })
  })

  it('retorna 429 no rate limit', async () => {
    heavyLimit.mockResolvedValue({ success: false })
    mockAuth({})

    const res = await POST(
      new Request('http://localhost/api/checkin/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )

    expect(res.status).toBe(429)
  })

  it('retorna 401 sem usuário', async () => {
    mockAuth({ user: null })

    const res = await POST(
      new Request('http://localhost/api/checkin/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 403 para aluno', async () => {
    mockAuth({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/checkin/confirm', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('retorna 400 com body inválido', async () => {
    mockAuth({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/checkin/confirm', {
        method: 'POST',
        body: JSON.stringify({ checkin_id: 'x', students: [] }),
      }),
    )

    expect(res.status).toBe(400)
  })
})
