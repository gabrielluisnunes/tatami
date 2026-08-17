/**
 * @jest-environment node
 */
import { GET } from '@/app/api/classes/route'
import { createClient } from '@/lib/supabase/server'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>

function mockClasses(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
  classes?: unknown[]
}) {
  const thenableQuery = {
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({
      data: opts.classes ?? [],
      error: null,
    }),
  }

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
      if (table === 'classes') {
        return {
          select: jest.fn().mockReturnValue(thenableQuery),
        }
      }
      return {}
    }),
  } as never)
}

describe('GET /api/classes', () => {
  it('retorna 401 sem usuário', async () => {
    mockClasses({ user: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('retorna 403 para aluno', async () => {
    mockClasses({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy },
    })
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('retorna lista para admin', async () => {
    mockClasses({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
      classes: [{ id: 'c1', name: 'Kids' }],
    })
    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      classes: [{ id: 'c1', name: 'Kids' }],
    })
  })
})
