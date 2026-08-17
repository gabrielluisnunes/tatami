/**
 * @jest-environment node
 */
import { createClient } from '@/lib/supabase/server'
import { markAsAwaitingConfirmation } from '@/lib/services/financials.service'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/services/financials.service', () => ({
  markAsAwaitingConfirmation: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const markAwaitingMock = markAsAwaitingConfirmation as jest.MockedFunction<
  typeof markAsAwaitingConfirmation
>

function mockUser(opts: {
  user?: { id: string } | null
  profile?: { role: string; academy_id: string | null } | null
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
}

describe('PATCH /api/financials/[id]/aguardando', () => {
  let PATCH: typeof import('@/app/api/financials/[id]/aguardando/route').PATCH

  beforeAll(async () => {
    ;({ PATCH } = await import('@/app/api/financials/[id]/aguardando/route'))
  })

  it('retorna 401 sem usuário', async () => {
    mockUser({ user: null })

    const res = await PATCH(new Request('http://localhost'), {
      params: { id: IDS.financial },
    })

    expect(res.status).toBe(401)
  })

  it('retorna 403 se não for aluno', async () => {
    mockUser({
      user: { id: IDS.admin },
      profile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await PATCH(new Request('http://localhost'), {
      params: { id: IDS.financial },
    })

    expect(res.status).toBe(403)
  })

  it('retorna 404 quando service não acha cobrança', async () => {
    mockUser({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy },
    })
    markAwaitingMock.mockResolvedValue({ ok: false, error: 'not_found' })

    const res = await PATCH(new Request('http://localhost'), {
      params: { id: IDS.financial },
    })

    expect(res.status).toBe(404)
  })

  it('retorna 200 no sucesso', async () => {
    mockUser({
      user: { id: IDS.student },
      profile: { role: 'aluno', academy_id: IDS.academy },
    })
    markAwaitingMock.mockResolvedValue({ ok: true })

    const res = await PATCH(new Request('http://localhost'), {
      params: { id: IDS.financial },
    })

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })
  })
})
