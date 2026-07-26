import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendComunicado } from '@/lib/notifications'

const schema = z.object({
  title: z.string().min(3).max(100),
  message: z.string().min(10).max(2000),
})

export async function POST(request: Request) {
  const supabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Buscar nome da academia
  const { data: academy } = await supabase
    .from('academies')
    .select('name')
    .eq('id', profile.academy_id)
    .single()

  // Buscar todos os alunos da academia
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')

  if (!students || students.length === 0) {
    return NextResponse.json({ error: 'Nenhum aluno encontrado' }, { status: 404 })
  }

  // Buscar emails via auth.admin
  const { data: { users: authUsers } } = await supabase.auth.admin.listUsers()
  const emailMap = new Map(authUsers.map(u => [u.id, u.email]))

  const recipients = students
    .map(s => ({
      email: emailMap.get(s.id) ?? '',
      name: s.full_name,
    }))
    .filter(r => r.email !== '')

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Nenhum email encontrado' }, { status: 404 })
  }

  const { sent, failed } = await sendComunicado(
    recipients,
    body.title,
    body.message,
    academy?.name ?? 'sua academia',
  )

  return NextResponse.json({ 
    success: true, 
    sent, 
    failed,
    total: recipients.length 
  })
}
