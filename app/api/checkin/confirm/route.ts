import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const confirmSchema = z.object({
  checkin_id: z.string().uuid(),
  students: z.array(z.object({
    student_id: z.string().uuid(),
    source: z.enum(['ai', 'manual']),
    similarity: z.number().min(0).max(1).optional(),
  })).min(1, 'Nenhum aluno confirmado'),
})

type ClassSportRelation = { sport: string } | { sport: string }[] | null

function resolveTurmaSport(classes: ClassSportRelation): string | null {
  if (!classes) return null
  if (Array.isArray(classes)) return classes[0]?.sport ?? null
  return classes.sport ?? null
}

export async function POST(request: Request) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id || !['professor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof confirmSchema>
  try {
    body = confirmSchema.parse(await request.json())
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { createStorageAdminClient } = await import('@/lib/supabase/server')
  const adminSupabase = createStorageAdminClient()

  // Verifica check-in e busca esporte da turma
  const { data: checkinData } = await adminSupabase
    .from('checkins')
    .select('id, status, class_id, academy_id, classes(sport)')
    .eq('id', body.checkin_id)
    .single()

  if (!checkinData || checkinData.academy_id !== profile.academy_id) {
    return NextResponse.json({ error: 'Check-in não encontrado' }, { status: 404 })
  }

  const turmaSport = resolveTurmaSport(checkinData.classes as ClassSportRelation)

  if (!turmaSport) {
    return NextResponse.json(
      { error: 'Turma sem esporte cadastrado. Edite a turma e defina o esporte antes de confirmar.' },
      { status: 400 }
    )
  }

  const eligibleStudents: typeof body.students = []
  const skipped: Array<{ student_id: string; reason: 'sport_mismatch' }> = []

  // Validar se cada aluno pratica o esporte da turma
  for (const student of body.students) {
    const { data: studentSport } = await adminSupabase
      .from('student_sports')
      .select('id')
      .eq('student_id', student.student_id)
      .eq('sport', turmaSport)
      .eq('academy_id', profile.academy_id)
      .maybeSingle()

    if (!studentSport) {
      // Aluno não pratica esse esporte — pular, não registrar presença
      console.log(`[CHECKIN] Aluno ${student.student_id} não pratica ${turmaSport} — ignorado`)
      skipped.push({ student_id: student.student_id, reason: 'sport_mismatch' })
      continue
    }

    eligibleStudents.push(student)
  }

  const now = new Date().toISOString()

  // Deleta presenças existentes para esse check-in (para lidar com remoções de alunos e re-confirmação)
  const { error: deleteError } = await supabase
    .from('attendance')
    .delete()
    .eq('checkin_id', body.checkin_id)

  if (deleteError) {
    return NextResponse.json({ error: 'Erro ao limpar presenças anteriores' }, { status: 500 })
  }

  // Insere registros de presença apenas dos alunos elegíveis
  const attendanceRecords = eligibleStudents.map(({ student_id, source, similarity }) => ({
    checkin_id: body.checkin_id,
    student_id,
    academy_id: profile.academy_id,
    source,
    similarity: similarity ?? null,
    present_at: now,
  }))

  if (attendanceRecords.length > 0) {
    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert(attendanceRecords)

    if (attendanceError) {
      return NextResponse.json({ error: 'Erro ao registrar presenças' }, { status: 500 })
    }
  }

  // Atualiza status do check-in para 'confirmed'
  await supabase
    .from('checkins')
    .update({ status: 'confirmed', confirmed_at: now })
    .eq('id', body.checkin_id)

  return NextResponse.json({
    success: true,
    count: attendanceRecords.length,
    skipped,
  })
}
