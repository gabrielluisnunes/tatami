/**
 * @jest-environment node
 */
import { rateLimiters } from '@/lib/rate-limit'
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
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

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>
const defaultLimit = rateLimiters.default.limit as jest.Mock

const validBody = {
  student_id: IDS.student,
  belt: 'azul',
  degree: 1,
  sport: 'jiu-jitsu',
}

function mockAdminFlow(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
  student?: { id: string; sport: string } | null
  studentSport?: { belt: string; degree: number } | null
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
            eq: jest.fn().mockImplementation((col: string) => {
              if (col === 'id') {
                // admin profile: .eq('id').single()
                // student: .eq('id').eq('academy_id').eq('role').single()
                return {
                  single: jest.fn().mockResolvedValue({ data: opts.profile ?? null }),
                  eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                      single: jest.fn().mockResolvedValue({ data: opts.student ?? null }),
                    }),
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: opts.student ?? null }),
                }),
              }
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {}
    }),
  } as never)

  createStorageAdminClientMock.mockReturnValue({
    from: jest.fn((table: string) => {
      if (table === 'student_sports') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: opts.studentSport ?? { belt: 'branca', degree: 0 },
                  }),
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }
      }
      if (table === 'belt_history') {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    }),
  } as never)
}

describe('POST /api/graduations', () => {
  let POST: typeof import('@/app/api/graduations/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/graduations/route'))
  })

  beforeEach(() => {
    defaultLimit.mockResolvedValue({ success: true })
  })

  it('retorna 401 sem usuário', async () => {
    mockAdminFlow({ user: null })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 400 para boxe', async () => {
    mockAdminFlow({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
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
    mockAdminFlow({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
      student: null,
    })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(404)
  })

  it('retorna 400 se grau não avança na mesma faixa', async () => {
    mockAdminFlow({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
      student: { id: IDS.student, sport: 'jiu-jitsu' },
      studentSport: { belt: 'azul', degree: 2 },
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
    mockAdminFlow({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
      student: { id: IDS.student, sport: 'jiu-jitsu' },
      studentSport: { belt: 'branca', degree: 0 },
    })

    const res = await POST(
      new Request('http://localhost/api/graduations', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
