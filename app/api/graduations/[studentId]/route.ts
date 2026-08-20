import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getGraduationHistory } from '@/lib/services/graduations.service'

export async function GET(
  _request: Request,
  { params }: { params: { studentId: string } },
) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const sportFilter = new URL(_request.url).searchParams.get('sport')

  const result = await getGraduationHistory(
    adminSupabase,
    params.studentId,
    profile.academy_id,
    sportFilter,
  )

  if (!result.ok) {
    if (result.error === 'student_not_found') {
      return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
  }

  return NextResponse.json({
    student: result.student,
    history: result.history,
  })
}
