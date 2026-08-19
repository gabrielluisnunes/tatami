import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/notifications'
import { rateLimiters, getIp } from '@/lib/rate-limit'
import { generateTempPassword } from '@/lib/temp-password'
import { enrollMember } from '@/lib/services/students.service'
import * as studentsRepo from '@/lib/repositories/students.repository'

const sportItemSchema = z.object({
  sport: z.enum(['jiu-jitsu', 'muay-thai', 'boxe']),
  belt: z.string().optional().nullable(),
  degree: z.number().int().min(0).max(4).default(0),
})

const enrollSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['aluno', 'professor']),
  sports: z.array(sportItemSchema).default([]),
  birth_date: z.string().optional(),
  phone: z.string().optional(),
  emergency_phone: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
})

export async function POST(request: Request) {
  const ip = getIp(request)
  const { success } = await rateLimiters.strict.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
      { status: 429 },
    )
  }

  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof enrollSchema>
  try {
    body = enrollSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const passwordWasGenerated = !body.password?.trim()
  const tempPassword = body.password?.trim() || generateTempPassword()

  const result = await enrollMember(supabase, adminSupabase, {
    academyId: adminProfile.academy_id,
    enrolledBy: user.id,
    full_name: body.full_name,
    email: body.email,
    role: body.role,
    sports: body.sports,
    birth_date: body.birth_date,
    phone: body.phone,
    emergency_phone: body.emergency_phone,
    cep: body.cep,
    address: body.address,
    neighborhood: body.neighborhood,
    city: body.city,
    state: body.state,
    password: tempPassword,
  })

  if (!result.ok) {
    if (result.error === 'invalid_sports') {
      return NextResponse.json({ error: result.message ?? 'Dados inválidos' }, { status: 400 })
    }
    if (result.error === 'plan_limit_reached') {
      return NextResponse.json(
        {
          error:
            'Limite de 50 alunos do plano Starter foi atingido. Faça upgrade para o plano Pro para cadastrar alunos ilimitados.',
          code: 'PLAN_LIMIT_REACHED',
        },
        { status: 403 },
      )
    }
    if (result.error === 'count_failed') {
      return NextResponse.json({ error: 'Erro ao verificar limite de alunos' }, { status: 500 })
    }
    if (result.error === 'email_already_registered') {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json(
      { error: result.message ?? 'Erro ao criar usuário' },
      { status: 500 },
    )
  }

  const { data: academy } = await studentsRepo.findAcademyById(supabase, adminProfile.academy_id)

  const origin = request.headers.get('origin') ?? 'https://tatami.app'
  let emailSent = false
  try {
    emailSent = await sendWelcomeEmail(
      body.email,
      body.full_name,
      academy?.name ?? 'sua academia',
      tempPassword,
      `${origin}/auth/login`,
      body.role,
    )
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('Falha ao enviar email de boas-vindas:', error?.message ?? err)
  }

  return NextResponse.json({
    success: true,
    user_id: result.userId,
    email_sent: emailSent,
    ...(passwordWasGenerated && !emailSent ? { temp_password: tempPassword } : {}),
  })
}
