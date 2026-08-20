import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimiters, getIp } from '@/lib/rate-limit'
import { registerGraduation } from '@/lib/services/graduations.service'

const BELTS = [
  'branca', 'azul', 'roxa', 'marrom', 'preta',
  'branco', 'laranja', 'azul-mt', 'vermelho', 'amarelo', 'verde', 'marrom-mt', 'preto-mt',
] as const

const graduationSchema = z.object({
  student_id: z.string().uuid(),
  belt: z.enum(BELTS),
  degree: z.number().int().min(0).max(4),
  sport: z.enum(['jiu-jitsu', 'muay-thai', 'boxe']).default('jiu-jitsu'),
  notes: z.string().optional(),
  trainings_at_graduation: z.number().int().min(0).optional(),
})

export async function POST(request: Request) {
  const ip = getIp(request)
  const { success } = await rateLimiters.default.limit(ip)
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

  const result = await registerGraduation(supabase, adminSupabase, {
    studentId: body.student_id,
    academyId: profile.academy_id,
    gradedBy: user.id,
    belt: body.belt,
    degree: body.degree,
    sport: body.sport,
    notes: body.notes,
    trainingsAtGraduation: body.trainings_at_graduation,
  })

  if (!result.ok) {
    if (result.error === 'boxe_no_graduation') {
      return NextResponse.json({ error: result.message ?? 'Boxe não possui graduação' }, { status: 400 })
    }
    if (result.error === 'student_not_found') {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }
    if (result.error === 'sport_not_found') {
      return NextResponse.json({ error: 'Esporte não encontrado para este aluno' }, { status: 404 })
    }
    if (result.error === 'degree_not_advancing') {
      return NextResponse.json(
        { error: result.message ?? 'Grau inválido' },
        { status: 400 },
      )
    }
    if (result.error === 'history_insert_failed') {
      return NextResponse.json({ error: 'Erro ao registrar graduação' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar faixa do aluno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
