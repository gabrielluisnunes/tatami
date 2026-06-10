import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/notifications'

// Charset sem caracteres ambíguos (0/O, 1/l/I)
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function generateTempPassword(length = 10): string {
  return Array.from(                
    { length },
    () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  ).join('')
}

const enrollSchema = z.object({
  full_name:       z.string().min(2),
  email:           z.string().email(),
  role:            z.enum(['aluno', 'professor']),
  belt:            z.string().default('branca'),
  phone:           z.string().optional(),
  emergency_phone: z.string().optional(),
  cep:             z.string().optional(),
  address:         z.string().optional(),
  neighborhood:    z.string().optional(),
  city:            z.string().optional(),
  state:           z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = createAdminClient()

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

  // Busca nome da academia para o email
  const { data: academy } = await supabase
    .from('academies')
    .select('name')                 
    .eq('id', adminProfile.academy_id)
    .single()

  const tempPassword = generateTempPassword()

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: tempPassword,         
    email_confirm: true,
    user_metadata: {
      full_name:  body.full_name,
      role:       body.role,
      academy_id: adminProfile.academy_id,
      belt:       body.belt,
    },
  })

  if (createError || !created.user) {
    if (createError?.message?.includes('already')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })        
  }

  const updates: Record<string, unknown> = {}

  if (body.phone)           updates.phone           = body.phone
  if (body.emergency_phone) updates.emergency_phone = body.emergency_phone
  if (body.cep)             updates.cep             = body.cep
  if (body.address)         updates.address         = body.address
  if (body.neighborhood)    updates.neighborhood    = body.neighborhood
  if (body.city)            updates.city            = body.city
  if (body.state)           updates.state           = body.state

  if (Object.keys(updates).length > 0) {
    await supabase.from('profiles').update(updates).eq('id', created.user.id)
  }

  // Envia email com senha temporária (não bloqueia resposta em caso de falha)
  const origin = request.headers.get('origin') ?? 'https://tatami.app'                
  sendWelcomeEmail(
    body.email,
    body.full_name,
    academy?.name ?? 'sua academia',
    tempPassword,                   
    `${origin}/auth/login`
  ).catch(err => console.error('Falha ao enviar email de boas-vindas:', err))

  return NextResponse.json({ success: true, user_id: created.user.id })
}
