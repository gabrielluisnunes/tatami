/**
 * @jest-environment node
 */
import { rateLimiters } from '@/lib/rate-limit'
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { registerGraduation } from '@/lib/services/graduations.service'
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

jest.mock('@/lib/services/graduations.service', () => ({
  registerGraduation: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>
const defaultLimit = rateLimiters.default.limit as jest.Mock
const registerGraduationMock = registerGraduation as jest.MockedFunction<typeof registerGraduation>

const validBody = {
  student_id: IDS.student,
  belt: 'azul',
  degree: 1,
  sport: 'jiu-jitsu',
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
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
            }),
          }),
        }
      }
      return {}
    }),
  } as never)

  createStorageAdminClientMock.mockReturnValue({} as never)
}

describe('POST /api/graduations', () => {
  let POST: typeof import('@/app/api/graduations/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/graduations/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    defaultLimit.mockResolvedValue({ success: true })
  })

  it('retorna 401 sem usuário', async () => {
    mockAuth({ user: null })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(401)
    expect(registerGraduationMock).not.toHaveBeenCalled()
  })

  it('retorna 400 para boxe', async () => {
    mockAuth({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })
    registerGraduationMock.mockResolvedValue({
      ok: false,
      error: 'boxe_no_graduation',
      message: 'Boxe não possui graduação',
    })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, sport: 'boxe', belt: 'branco' }),
      }),
    )

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Boxe não possui graduação' })
  })

  it('retorna 404 se aluno não existe na academia', async () => {
    mockAuth({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })
    registerGraduationMock.mockResolvedValue({ ok: false, error: 'student_not_found' })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(404)
  })

  it('retorna 400 se grau não avança na mesma faixa', async () => {
    mockAuth({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })
    registerGraduationMock.mockResolvedValue({
      ok: false,
      error: 'degree_not_advancing',
      message: 'Para promoção de grau na mesma faixa, o novo grau deve ser maior que o atual (2º grau)',
    })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify({ ...validBody, belt: 'azul', degree: 1 }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 200 na promoção válida', async () => {
    mockAuth({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })
    registerGraduationMock.mockResolvedValue({ ok: true })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
    expect(registerGraduationMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        studentId: IDS.student,
        academyId: IDS.academy,
        belt: 'azul',
        degree: 1,
        sport: 'jiu-jitsu',
      }),
    )
  })
})
