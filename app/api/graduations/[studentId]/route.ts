import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RawGraduationHistoryItem {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  graders: { full_name: string } | null
}

export async function GET(
  _request: Request,
  { params }: { params: { studentId: string } }
) {
  const supabase = createClient()

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

  // Buscar dados do aluno
  const adminSupabase = createStorageAdminClient()

  const { data: student } = await adminSupabase
    .from('profiles')
    .select('id, full_name, belt, degree, photo_url, created_at')
    .eq('id', params.studentId)
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })
  }

  // Gerar signed URL da foto
  let photoUrl = student.photo_url ?? null
  if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
    const { data } = await adminSupabase.storage
      .from('student-photos')
      .createSignedUrl(photoUrl, 3600)
    photoUrl = data?.signedUrl ?? null
  }

  // Buscar histórico de graduações
  const { data: rawHistory } = await adminSupabase
    .from('belt_history')
    .select(`
      id,
      belt,
      degree,
      graded_at,
      notes,
      trainings_at_graduation,
      graders:profiles!belt_history_graded_by_fkey ( full_name )
    `)
    .eq('student_id', params.studentId)
    .eq('academy_id', profile.academy_id)
    .order('graded_at', { ascending: false })

  const history = (rawHistory as unknown as RawGraduationHistoryItem[] ?? []).map((item) => ({
    id:                      item.id,
    belt:                    item.belt ?? 'branca',
    degree:                  item.degree ?? 0,
    graded_at:               item.graded_at,
    notes:                   item.notes,
    trainings_at_graduation: item.trainings_at_graduation,
    graded_by_name:          item.graders?.full_name ?? null,
  }))

  return NextResponse.json({
    student: {
      id:         student.id,
      full_name:  student.full_name,
      belt:       student.belt ?? 'branca',
      degree:     student.degree ?? 0,
      photo_url:  photoUrl,
      created_at: student.created_at,
    },
    history,
  })
}
