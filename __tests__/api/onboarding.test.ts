/**
 * @jest-environment node
 */
import { createClient } from '@/lib/supabase/server'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>

function mockOnboarding(opts: {
  user?: { id: string } | null
  profile?: { role: string | null; academy_id: string | null } | null
  academyInsert?: { id: string } | null
  academyError?: unknown
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
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'academies') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: opts.academyInsert ?? null,
                error: opts.academyError ?? null,
              }),
            }),
          }),
        }
      }
      return {}
    }),
  } as never)
}

const validBody = {
  full_name: 'Gabriel Admin',
  name: 'Academia Tatami',
  sport: 'jiu-jitsu',
  monthly_price: 175,
}

describe('POST /api/onboarding', () => {
  let POST: typeof import('@/app/api/onboarding/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/onboarding/route'))
  })

  it('retorna 401 sem usuário', async () => {
    mockOnboarding({ user: null })

    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 403 se role não é admin', async () => {
    mockOnboarding({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: null },
    })

    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('retorna 400 se academia já configurada', async () => {
    mockOnboarding({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 200 e academy_id no sucesso', async () => {
    mockOnboarding({
      user: { id: IDS.admin },
      profile: { role: null, academy_id: null },
      academyInsert: { id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/onboarding', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      academy_id: IDS.academy,
    })
  })
})
