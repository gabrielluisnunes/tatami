import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/notifications'
import { rateLimiters, getIp } from '@/lib/rate-limit'

// Charset sem caracteres ambíguos (0/O, 1/l/I)
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 10): string {
  return Array.from(
    { length },
    () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  ).join('')
}

const enrollSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['aluno', 'professor']),
  sports: z.array(z.object({
    sport: z.enum(['jiu-jitsu', 'muay-thai', 'boxe']),
    belt: z.string().optional().nullable(),
    degree: z.number().int().min(0).max(4).default(0),
  })).min(1),
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
      { status: 429 }
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

  // Busca nome e plano da academia para o email e validação
  const { data: academy } = await supabase
    .from('academies')
    .select('name, plan')
    .eq('id', adminProfile.academy_id)
    .single()

  if (body.role === 'aluno' && academy?.plan === 'starter') {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('academy_id', adminProfile.academy_id)
      .eq('role', 'aluno')

    if (countError) {
      return NextResponse.json({ error: 'Erro ao verificar limite de alunos' }, { status: 500 })
    }

    if ((count ?? 0) >= 50) {
      return NextResponse.json(
        {
          error: 'Limite de 50 alunos do plano Starter foi atingido. Faça upgrade para o plano Pro para cadastrar alunos ilimitados.',
          code: 'PLAN_LIMIT_REACHED'
        },
        { status: 403 }
      )
    }
  }

  const primarySport = body.sports[0]
  const tempPassword = body.password?.trim() || generateTempPassword()

  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email: body.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      role: body.role,
      academy_id: adminProfile.academy_id,
      belt: primarySport.belt ?? null,
    },
  })

  if (createError || !created.user) {
    console.error('[ENROLL] createUser error:', JSON.stringify(createError))
    if (createError?.message?.includes('already')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: createError?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  const updates: Record<string, unknown> = {
    full_name: body.full_name,
    role: body.role,
    academy_id: adminProfile.academy_id,
    sport: primarySport.sport,
    belt: primarySport.belt ?? null,
    degree: primarySport.sport === 'jiu-jitsu' ? (primarySport.degree ?? 0) : 0,
  }

  if (body.birth_date) updates.birth_date = body.birth_date
  if (body.phone) updates.phone = body.phone
  if (body.emergency_phone) updates.emergency_phone = body.emergency_phone
  if (body.cep) updates.cep = body.cep
  if (body.address) updates.address = body.address
  if (body.neighborhood) updates.neighborhood = body.neighborhood
  if (body.city) updates.city = body.city
  if (body.state) updates.state = body.state

  if (Object.keys(updates).length > 0) {
    const { error: profileError } = await adminSupabase.from('profiles').update(updates).eq('id', created.user.id)
    if (profileError) console.error('[ENROLL] profiles update error:', JSON.stringify(profileError))
  }

  for (const s of body.sports) {
    // Inserir em student_sports
    const { error: ssError } = await adminSupabase
      .from('student_sports')
      .insert({
        student_id: created.user.id,
        academy_id: adminProfile.academy_id,
        sport: s.sport,
        belt: s.sport !== 'boxe' ? (s.belt ?? null) : null,
        degree: s.sport === 'jiu-jitsu' ? (s.degree ?? 0) : 0,
      })
    if (ssError) console.error('[ENROLL] student_sports error:', JSON.stringify(ssError))

    // Inserir em belt_history (exceto boxe)
    if (s.sport !== 'boxe') {
      const { error: bhError } = await adminSupabase
        .from('belt_history')
        .insert({
          student_id: created.user.id,
          academy_id: adminProfile.academy_id,
          belt: s.belt ?? (s.sport === 'jiu-jitsu' ? 'branca' : 'branco'),
          degree: s.sport === 'jiu-jitsu' ? (s.degree ?? 0) : 0,
          sport: s.sport,
          graded_at: new Date().toISOString(),
          graded_by: user.id,
          notes: 'Graduação de cadastro inicial',
          trainings_at_graduation: 0,
        })
      if (bhError) console.error('[ENROLL] belt_history error:', JSON.stringify(bhError))
    }
  }

  // Envia email com senha temporária (aguarda envio; não bloqueia cadastro em caso de falha)
  const origin = request.headers.get('origin') ?? 'https://tatami.app'
  try {
    await sendWelcomeEmail(
      body.email,
      body.full_name,
      academy?.name ?? 'sua academia',
      tempPassword,
      `${origin}/auth/login`
    )
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('Falha ao enviar email de boas-vindas:', error?.message ?? err)
    // Não bloquear o cadastro se o email falhar — usuário já foi criado
  }

  return NextResponse.json({ success: true, user_id: created.user.id })
}
