import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
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

  // Busca todos os checkins desta turma que pertencem à academia
  const { data: checkins, error: checkinsError } = await supabase
    .from('checkins')
    .select('id')
    .eq('class_id', params.id)
    .eq('academy_id', profile.academy_id)

  if (checkinsError) {
    return NextResponse.json({ error: 'Erro ao buscar presenças' }, { status: 500 })
  }

  if (!checkins || checkins.length === 0) {
    return NextResponse.json({ students: [] })
  }

  const checkinIds = checkins.map(c => c.id)

  // Busca todas as presenças desses checkins
  const { data: attendanceRows, error: attError } = await supabase
    .from('attendance')
    .select('student_id')
    .in('checkin_id', checkinIds)

  if (attError) {
    return NextResponse.json({ error: 'Erro ao buscar presenças' }, { status: 500 })
  }

  if (!attendanceRows || attendanceRows.length === 0) {
    return NextResponse.json({ students: [] })
  }

  // Agrupa por student_id e conta presenças
  const countMap = new Map<string, number>()
  for (const row of attendanceRows) {
    countMap.set(row.student_id, (countMap.get(row.student_id) ?? 0) + 1)
  }

  const studentIds = Array.from(countMap.keys())

  // Busca nomes dos alunos
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)
    .eq('academy_id', profile.academy_id)

  if (profilesError) {
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 })
  }

  const students = (profiles ?? [])
    .map(p => ({
      student_id: p.id,
      full_name:  p.full_name,
      count:      countMap.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ students })
}
