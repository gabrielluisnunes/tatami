/**
 * @jest-environment node
 */
import { rateLimiters } from '@/lib/rate-limit'
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/notifications'
import { IDS } from '../helpers/mocks'

jest.mock('@/lib/rate-limit', () => ({
  getIp: jest.fn(() => '127.0.0.1'),
  rateLimiters: {
    strict: { limit: jest.fn() },
    default: { limit: jest.fn() },
    heavy: { limit: jest.fn() },
  },
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createStorageAdminClient: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>
const strictLimit = rateLimiters.strict.limit as jest.Mock
const sendWelcomeEmailMock = sendWelcomeEmail as jest.MockedFunction<typeof sendWelcomeEmail>

function allowRateLimit(ok = true) {
  strictLimit.mockResolvedValue({ success: ok })
}

function mockClients(opts: {
  user?: { id: string } | null
  adminProfile?: { role: string; academy_id: string | null } | null
  academy?: { name: string; plan: string } | null
  studentCount?: number
  createUserError?: { message: string } | null
  createdUserId?: string
}) {
  const profileSingle = jest.fn().mockResolvedValue({ data: opts.adminProfile ?? null })
  const academySingle = jest.fn().mockResolvedValue({ data: opts.academy ?? { name: 'Academia', plan: 'pro' } })
  const countHead = jest.fn().mockResolvedValue({
    count: opts.studentCount ?? 0,
    error: null,
  })

  createClientMock.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: opts.user === undefined ? { id: IDS.admin } : opts.user },
      }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn((_cols?: string, opts2?: { count?: string; head?: boolean }) => {
            if (opts2?.head) {
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue(countHead()),
                }),
              }
            }
            return {
              eq: jest.fn().mockReturnValue({
                single: profileSingle,
              }),
            }
          }),
        }
      }
      if (table === 'academies') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: academySingle,
            }),
          }),
        }
      }
      return { select: jest.fn() }
    }),
  } as never)

  createStorageAdminClientMock.mockReturnValue({
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({
          data: opts.createUserError
            ? { user: null }
            : { user: { id: opts.createdUserId ?? IDS.student } },
          error: opts.createUserError ?? null,
        }),
      },
    },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  } as never)
}

describe('POST /api/students/enroll', () => {
  let POST: typeof import('@/app/api/students/enroll/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/students/enroll/route'))
  })

  beforeEach(() => {
    sendWelcomeEmailMock.mockResolvedValue(true)
  })

  const validBody = {
    full_name: 'Aluno Teste',
    email: 'aluno@teste.com',
    role: 'aluno' as const,
    sports: [{ sport: 'jiu-jitsu' as const, belt: 'branca', degree: 0 }],
  }

  it('retorna 429 quando rate limit estoura', async () => {
    allowRateLimit(false)
    mockClients({})

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(429)
  })

  it('retorna 401 sem usuário', async () => {
    allowRateLimit(true)
    mockClients({ user: null })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(401)
  })

  it('retorna 403 se não for admin', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'professor', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('retorna 400 com body inválido', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify({ full_name: 'A' }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 403 no limite do plano Starter', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
      academy: { name: 'Dojo', plan: 'starter' },
      studentCount: 50,
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.code).toBe('PLAN_LIMIT_REACHED')
  })

  it('retorna 200 e cria usuário no caminho feliz', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
      academy: { name: 'Dojo', plan: 'pro' },
      createdUserId: IDS.student,
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      success: true,
      user_id: IDS.student,
      email_sent: true,
    })
    expect(sendWelcomeEmailMock).toHaveBeenCalled()
  })

  it('retorna 400 se aluno não enviar esportes', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Aluno Teste',
          email: 'aluno@teste.com',
          role: 'aluno',
        }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('retorna 400 se professor não enviar esportes', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Prof Teste',
          email: 'prof@teste.com',
          role: 'professor',
          belt: 'preta',
          degree: 1,
        }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('cadastra professor sem inserir student_sports', async () => {
    allowRateLimit(true)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
      academy: { name: 'Dojo', plan: 'pro' },
      createdUserId: IDS.student,
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        body: JSON.stringify({
          full_name: 'Prof Teste',
          email: 'prof@teste.com',
          role: 'professor',
          sports: [{ sport: 'jiu-jitsu', belt: 'preta', degree: 1 }],
        }),
      }),
    )

    expect(res.status).toBe(200)
    const adminFrom = createStorageAdminClientMock.mock.results.at(-1)?.value.from as jest.Mock
    expect(adminFrom).not.toHaveBeenCalledWith('student_sports')
    expect(adminFrom).not.toHaveBeenCalledWith('belt_history')
  })

  it('devolve temp_password quando email falha e senha foi gerada', async () => {
    allowRateLimit(true)
    sendWelcomeEmailMock.mockResolvedValue(false)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
      academy: { name: 'Dojo', plan: 'pro' },
      createdUserId: IDS.student,
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.email_sent).toBe(false)
    expect(typeof json.temp_password).toBe('string')
    expect(json.temp_password.length).toBeGreaterThanOrEqual(6)
  })

  it('não devolve temp_password quando admin definiu senha manual', async () => {
    allowRateLimit(true)
    sendWelcomeEmailMock.mockResolvedValue(false)
    mockClients({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
      academy: { name: 'Dojo', plan: 'pro' },
      createdUserId: IDS.student,
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        body: JSON.stringify({ ...validBody, password: 'senha123' }),
      }),
    )

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.temp_password).toBeUndefined()
  })
})
