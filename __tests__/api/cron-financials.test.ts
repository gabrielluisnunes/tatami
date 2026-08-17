/**
 * @jest-environment node
 */
import { createAdminClient } from '@/lib/supabase/server'
import * as financialsRepo from '@/lib/repositories/financials.repository'
import { sendOverdueAlert, sendDueTodayAlert } from '@/lib/notifications'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/repositories/financials.repository', () => ({
  findPendingOverdueBefore: jest.fn(),
  updateStatusByIds: jest.fn(),
  findExistingInMonth: jest.fn(),
  insertFinancial: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendOverdueAlert: jest.fn().mockResolvedValue(undefined),
  sendDueTodayAlert: jest.fn().mockResolvedValue(undefined),
}))

const createAdminClientMock = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const repo = financialsRepo as jest.Mocked<typeof financialsRepo>

describe('GET /api/cron/update-overdue', () => {
  let GET: typeof import('@/app/api/cron/update-overdue/route').GET

  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/cron/update-overdue/route'))
  })

  it('retorna 401 sem Bearer CRON_SECRET', async () => {
    const res = await GET(new Request('http://localhost/api/cron/update-overdue'))
    expect(res.status).toBe(401)
  })

  it('retorna updated: 0 quando não há pendentes', async () => {
    createAdminClientMock.mockReturnValue({} as never)
    repo.findPendingOverdueBefore.mockResolvedValue({
      data: [],
      error: null,
    } as never)

    const res = await GET(
      new Request('http://localhost/api/cron/update-overdue', {
        headers: { authorization: 'Bearer cron_test_secret' },
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ updated: 0 })
  })

  it('atualiza pendentes para overdue', async () => {
    createAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      }),
    } as never)

    repo.findPendingOverdueBefore.mockResolvedValue({
      data: [
        {
          id: 'f1',
          student_id: 's1',
          academy_id: 'a1',
          amount: 175,
          due_date: '2026-08-01',
          profiles: { full_name: 'Aluno' },
        },
      ],
      error: null,
    } as never)
    repo.updateStatusByIds.mockResolvedValue({ error: null } as never)

    const res = await GET(
      new Request('http://localhost/api/cron/update-overdue', {
        headers: { authorization: 'Bearer cron_test_secret' },
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ updated: 1 })
    expect(repo.updateStatusByIds).toHaveBeenCalledWith(expect.anything(), ['f1'], 'overdue')
  })
})

describe('GET /api/cron/generate-monthly-charges', () => {
  let GET: typeof import('@/app/api/cron/generate-monthly-charges/route').GET

  beforeAll(async () => {
    ;({ GET } = await import('@/app/api/cron/generate-monthly-charges/route'))
  })

  it('retorna 401 sem Bearer CRON_SECRET', async () => {
    const res = await GET(new Request('http://localhost/api/cron/generate-monthly-charges'))
    expect(res.status).toBe(401)
  })

  it('retorna created: 0 quando não há alunos elegíveis', async () => {
    createAdminClientMock.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as never)

    const res = await GET(
      new Request('http://localhost/api/cron/generate-monthly-charges', {
        headers: { authorization: 'Bearer cron_test_secret' },
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ created: 0 })
  })
})

// silencia unused import warnings em TS estrito nos mocks de email
void sendOverdueAlert
void sendDueTodayAlert
