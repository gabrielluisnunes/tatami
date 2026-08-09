import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RawGraduationHistoryItem {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  sport: string | null
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

  const { searchParams } = new URL(_request.url)
  const sportFilter = searchParams.get('sport')

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

  // Faixa/grau do esporte solicitado (fonte da verdade)
  let sportBelt = student.belt ?? 'branca'
  let sportDegree = student.degree ?? 0
  let sportValue = sportFilter ?? 'jiu-jitsu'

  if (sportFilter) {
    const { data: studentSport } = await adminSupabase
      .from('student_sports')
      .select('sport, belt, degree')
      .eq('student_id', params.studentId)
      .eq('academy_id', profile.academy_id)
      .eq('sport', sportFilter)
      .maybeSingle()

    if (studentSport) {
      sportValue = studentSport.sport
      sportBelt = studentSport.sport === 'boxe'
        ? ''
        : (studentSport.belt ?? (studentSport.sport === 'muay-thai' ? 'branco' : 'branca'))
      sportDegree = studentSport.sport === 'jiu-jitsu' ? (studentSport.degree ?? 0) : 0
    }
  }

  let photoUrl = student.photo_url ?? null
  if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
    const { data } = await adminSupabase.storage
      .from('student-photos')
      .createSignedUrl(photoUrl, 3600)
    photoUrl = data?.signedUrl ?? null
  }

  // Boxe não tem histórico de graduação
  if (sportFilter === 'boxe') {
    return NextResponse.json({
      student: {
        id:         student.id,
        full_name:  student.full_name,
        belt:       '',
        degree:     0,
        sport:      'boxe',
        photo_url:  photoUrl,
        created_at: student.created_at,
      },
      history: [],
    })
  }

  const { data: rawHistory, error: historyError } = await adminSupabase
    .from('belt_history')
    .select(`
      id,
      belt,
      degree,
      graded_at,
      notes,
      trainings_at_graduation,
      sport,
      graders:profiles!belt_history_graded_by_fkey ( full_name )
    `)
    .eq('student_id', params.studentId)
    .eq('academy_id', profile.academy_id)
    .order('graded_at', { ascending: true })

  if (historyError) {
    console.error('[GRADUATIONS] belt_history error:', historyError)
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
  }

  // Filtra por esporte em memória — sport null conta como jiu-jitsu (legado)
  const rawHistoryArray = ((rawHistory as unknown as RawGraduationHistoryItem[]) ?? [])
    .filter((item) => {
      if (!sportFilter) return true
      const itemSport = item.sport ?? 'jiu-jitsu'
      return itemSport === sportFilter
    })

  const { data: attendanceData } = await adminSupabase
    .from('attendance')
    .select('present_at')
    .eq('student_id', params.studentId)
    .order('present_at', { ascending: true })

  const attendanceTimestamps = (attendanceData ?? []).map(a => new Date(a.present_at).getTime())
  const lastIdx = rawHistoryArray.length - 1

  const history = rawHistoryArray.map((item, idx) => {
    const periodStart = new Date(item.graded_at).getTime()
    const periodEnd = idx === lastIdx
      ? Date.now()
      : new Date(rawHistoryArray[idx + 1].graded_at).getTime()

    return {
      id:                      item.id,
      belt:                    item.belt ?? 'branca',
      degree:                  item.degree ?? 0,
      graded_at:               item.graded_at,
      notes:                   item.notes,
      trainings_at_graduation: item.trainings_at_graduation,
      graded_by_name:          item.graders?.full_name ?? null,
      trainings_in_period:     attendanceTimestamps.filter(
        t => t >= periodStart && t < periodEnd
      ).length,
      sport:                   item.sport ?? 'jiu-jitsu',
    }
  })

  return NextResponse.json({
    student: {
      id:         student.id,
      full_name:  student.full_name,
      belt:       sportBelt,
      degree:     sportDegree,
      sport:      sportValue,
      photo_url:  photoUrl,
      created_at: student.created_at,
    },
    history,
  })
}
