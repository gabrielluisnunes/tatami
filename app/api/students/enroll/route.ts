import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const enrollSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['aluno', 'professor']),
  belt: z.string().default('branca'),
  phone: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = createAdminClient()

  // Autenticação: verifica que quem chama é admin com academia
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Valida body
  let body: z.infer<typeof enrollSchema>
  try {
    const raw = await request.json()
    body = enrollSchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Cria usuário no Supabase Auth passando metadata completo
  // O trigger handle_new_user vai criar o profile completo automaticamente
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      role: body.role,
      academy_id: adminProfile.academy_id,
      belt: body.belt,
    },
  })

  if (createError || !created.user) {
    if (createError?.message?.includes('already')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }

  // Atualiza phone se fornecido (campo não está no trigger)
  if (body.phone) {
    await supabase
      .from('profiles')
      .update({ phone: body.phone })
      .eq('id', created.user.id)
  }

  return NextResponse.json({
    success: true,
    user_id: created.user.id,
  })
}
