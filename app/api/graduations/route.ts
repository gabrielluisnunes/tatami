import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const BELTS = [
  'branca', 'azul', 'roxa', 'marrom', 'preta',
  'branco', 'laranja', 'azul-mt', 'vermelho', 'amarelo', 'verde', 'marrom-mt', 'preto-mt',
] as const

const graduationSchema = z.object({
  student_id:              z.string().uuid(),
  belt:                    z.enum(BELTS),
  degree:                  z.number().int().min(0).max(4),
  sport:                   z.enum(['jiu-jitsu', 'muay-thai', 'boxe']).default('jiu-jitsu'),
  notes:                   z.string().optional(),
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

  if (body.sport === 'boxe') {
    return NextResponse.json({ error: 'Boxe não possui graduação' }, { status: 400 })
  }

  // Verifica que o aluno pertence à academia
  const { data: student } = await supabase
    .from('profiles')
    .select('id, sport')
    .eq('id', body.student_id)
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }

  const storageAdmin = createStorageAdminClient()

  // Faixa/grau atuais vêm de student_sports (fonte da verdade por esporte)
  const { data: studentSport } = await storageAdmin
    .from('student_sports')
    .select('belt, degree')
    .eq('student_id', body.student_id)
    .eq('sport', body.sport)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!studentSport) {
    return NextResponse.json({ error: 'Esporte não encontrado para este aluno' }, { status: 404 })
  }

  const currentBelt = studentSport.belt
  const currentDegree = studentSport.degree ?? 0
  const nextDegree = body.sport === 'jiu-jitsu' ? body.degree : 0

  if (body.belt === currentBelt && nextDegree <= currentDegree) {
    return NextResponse.json(
      { error: `Para promoção de grau na mesma faixa, o novo grau deve ser maior que o atual (${currentDegree}º grau)` },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()

  // INSERT em belt_history (service role — consistente com a leitura do histórico)
  const { error: historyError } = await storageAdmin
    .from('belt_history')
    .insert({
      student_id:              body.student_id,
      academy_id:              profile.academy_id,
      belt:                    body.belt,
      degree:                  nextDegree,
      sport:                   body.sport,
      graded_at:               now,
      graded_by:               user.id,
      notes:                   body.notes ?? null,
      trainings_at_graduation: body.trainings_at_graduation ?? null,
    })

  if (historyError) {
    console.error('[GRADUATIONS] insert belt_history error:', historyError)
    return NextResponse.json({ error: 'Erro ao registrar graduação' }, { status: 500 })
  }

  // Atualizar student_sports (fonte da verdade)
  const { error: sportError } = await storageAdmin
    .from('student_sports')
    .update({
      belt: body.belt,
      degree: nextDegree,
      belt_updated_at: now,
    })
    .eq('student_id', body.student_id)
    .eq('sport', body.sport)

  if (sportError) {
    return NextResponse.json({ error: 'Erro ao atualizar faixa do aluno' }, { status: 500 })
  }

  // Sincronizar profiles se for o esporte principal
  if (student.sport === body.sport) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        belt: body.belt,
        degree: nextDegree,
        belt_updated_at: now,
      })
      .eq('id', body.student_id)

    if (profileError) {
      return NextResponse.json({ error: 'Erro ao atualizar faixa do aluno' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
