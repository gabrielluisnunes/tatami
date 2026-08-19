/**
 * @jest-environment node
 */
import { rateLimiters } from '@/lib/rate-limit'
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/notifications'
import { enrollMember } from '@/lib/services/students.service'
import * as studentsRepo from '@/lib/repositories/students.repository'
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

jest.mock('@/lib/services/students.service', () => ({
  enrollMember: jest.fn(),
}))

jest.mock('@/lib/repositories/students.repository', () => ({
  findAcademyById: jest.fn(),
}))

const createClientMock = createClient as jest.MockedFunction<typeof createClient>
const createStorageAdminClientMock = createStorageAdminClient as jest.MockedFunction<
  typeof createStorageAdminClient
>
const strictLimit = rateLimiters.strict.limit as jest.Mock
const sendWelcomeEmailMock = sendWelcomeEmail as jest.MockedFunction<typeof sendWelcomeEmail>
const enrollMemberMock = enrollMember as jest.MockedFunction<typeof enrollMember>
const findAcademyByIdMock = studentsRepo.findAcademyById as jest.MockedFunction<
  typeof studentsRepo.findAcademyById
>

function allowRateLimit(ok = true) {
  strictLimit.mockResolvedValue({ success: ok })
}

function mockAuth(opts: {
  user?: { id: string } | null
  adminProfile?: { role: string; academy_id: string | null } | null
}) {
  const profileSingle = jest.fn().mockResolvedValue({ data: opts.adminProfile ?? null })

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
              single: profileSingle,
            }),
          }),
        }
      }
      return { select: jest.fn() }
    }),
  } as never)

  createStorageAdminClientMock.mockReturnValue({} as never)
}

describe('POST /api/students/enroll', () => {
  let POST: typeof import('@/app/api/students/enroll/route').POST

  beforeAll(async () => {
    ;({ POST } = await import('@/app/api/students/enroll/route'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    sendWelcomeEmailMock.mockResolvedValue(true)
    findAcademyByIdMock.mockResolvedValue({
      data: { name: 'Dojo', plan: 'pro' },
      error: null,
    } as never)
  })

  const validBody = {
    full_name: 'Aluno Teste',
    email: 'aluno@teste.com',
    role: 'aluno' as const,
    sports: [{ sport: 'jiu-jitsu' as const, belt: 'branca', degree: 0 }],
  }

  it('retorna 429 quando rate limit estoura', async () => {
    allowRateLimit(false)
    mockAuth({})

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify(validBody),
      }),
    )

    expect(res.status).toBe(429)
    expect(enrollMemberMock).not.toHaveBeenCalled()
  })

  it('retorna 401 sem usuário', async () => {
    allowRateLimit(true)
    mockAuth({ user: null })

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
    mockAuth({
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
    mockAuth({
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
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({ ok: false, error: 'plan_limit_reached' })

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
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({ ok: true, userId: IDS.student })

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
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({
      ok: false,
      error: 'invalid_sports',
      message: 'Selecione pelo menos um esporte',
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
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({
      ok: false,
      error: 'invalid_sports',
      message: 'Selecione pelo menos um esporte que o professor ensina',
    })

    const res = await POST(
      new Request('http://localhost/api/students/enroll', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Prof Teste',
          email: 'prof@teste.com',
          role: 'professor',
        }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('cadastra professor com sucesso', async () => {
    allowRateLimit(true)
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({ ok: true, userId: IDS.student })

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
    expect(enrollMemberMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ role: 'professor' }),
    )
  })

  it('devolve temp_password quando email falha e senha foi gerada', async () => {
    allowRateLimit(true)
    sendWelcomeEmailMock.mockResolvedValue(false)
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({ ok: true, userId: IDS.student })

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
    mockAuth({
      user: { id: IDS.admin },
      adminProfile: { role: 'admin', academy_id: IDS.academy },
    })
    enrollMemberMock.mockResolvedValue({ ok: true, userId: IDS.student })

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
