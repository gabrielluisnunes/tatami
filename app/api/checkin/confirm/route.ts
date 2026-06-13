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

  // Verifica que o check-in pertence à academia do professor
  const { data: checkin } = await supabase
    .from('checkins')
    .select('id, status')
    .eq('id', body.checkin_id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!checkin) return NextResponse.json({ error: 'Check-in não encontrado' }, { status: 404 })

  const now = new Date().toISOString()

  // Deleta presenças existentes para esse check-in (para lidar com remoções de alunos e re-confirmação)
  const { error: deleteError } = await supabase
    .from('attendance')
    .delete()
    .eq('checkin_id', body.checkin_id)

  if (deleteError) {
    return NextResponse.json({ error: 'Erro ao limpar presenças anteriores' }, { status: 500 })
  }

  // Insere registros de presença
  const attendanceRecords = body.students.map(({ student_id, source, similarity }) => ({
    checkin_id: body.checkin_id,
    student_id,
    academy_id: profile.academy_id,
    source,
    similarity: similarity ?? null,
    present_at: now,
  }))

  const { error: attendanceError } = await supabase
    .from('attendance')
    .insert(attendanceRecords)

  if (attendanceError) {
    return NextResponse.json({ error: 'Erro ao registrar presenças' }, { status: 500 })
  }

  // Atualiza status do check-in para 'confirmed'
  await supabase
    .from('checkins')
    .update({ status: 'confirmed', confirmed_at: now })
    .eq('id', body.checkin_id)

  return NextResponse.json({ success: true, count: attendanceRecords.length })
}
