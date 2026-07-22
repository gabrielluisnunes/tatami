import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  student_id: z.string().uuid(),
  amount: z.number().positive(),
  paid_at: z.string(),
})

export async function POST(request: Request) {
  const supabase = createClient()

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

  // Verificar que o aluno pertence à academia do admin
  const { data: student } = await supabase
    .from('profiles')
    .select('id, academy_id')
    .eq('id', body.student_id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }

  // Criar cobrança já paga
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const due_date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

  const { error } = await supabase
    .from('financials')
    .insert({
      student_id: body.student_id,
      academy_id: profile.academy_id,
      amount: body.amount,
      due_date,
      paid_at: body.paid_at,
      status: 'paid',
    })

  if (error) {
    console.error('Erro ao registrar pagamento:', error)
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
