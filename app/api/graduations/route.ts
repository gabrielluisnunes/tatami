import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BELTS = ['branca', 'azul', 'roxa', 'marrom', 'preta'] as const

const graduationSchema = z.object({
  student_id: z.string().uuid(),
  belt: z.enum(BELTS),
  notes: z.string().optional(),
  trainings_at_graduation: z.number().int().min(0).optional(),
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

  let body: z.infer<typeof graduationSchema>
  try {
    body = graduationSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verifica que o aluno pertence à academia
  const { data: student } = await supabase
    .from('profiles')
    .select('id, belt')
    .eq('id', body.student_id)
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }

  const now = new Date().toISOString()

  // INSERT em belt_history
  const { error: historyError } = await supabase
    .from('belt_history')
    .insert({
      student_id: body.student_id,
      academy_id: profile.academy_id,
      belt: body.belt,
      graded_at: now,
      graded_by: user.id,
      notes: body.notes ?? null,
      trainings_at_graduation: body.trainings_at_graduation ?? null,
    })

  if (historyError) {
    return NextResponse.json({ error: 'Erro ao registrar graduação' }, { status: 500 })
  }

  // UPDATE em profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ belt: body.belt, belt_updated_at: now })
    .eq('id', body.student_id)

  if (profileError) {
    return NextResponse.json({ error: 'Erro ao atualizar faixa do aluno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
