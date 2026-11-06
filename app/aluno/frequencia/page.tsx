import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlunoHome, type RecentAttendance } from '@/components/aluno/aluno-home'

export default async function AlunoFrequenciaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, belt, degree, belt_updated_at, full_name, sport')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const storageAdmin = createStorageAdminClient()
  const { data: studentSports } = await storageAdmin
    .from('student_sports')
    .select('sport, belt, degree, belt_updated_at')
    .eq('student_id', user.id)
    .order('sport', { ascending: true })

  const sportsData = studentSports && studentSports.length > 0
    ? studentSports
    : [{
        sport: profile.sport ?? 'jiu-jitsu',
        belt: profile.belt,
        degree: profile.degree ?? 0,
        belt_updated_at: profile.belt_updated_at ?? null,
      }]

  const { data: pendingContracts } = await supabase
    .from('contracts')
    .select(`id, title, contract_signatures!left (student_id)`)
    .eq('academy_id', profile.academy_id)
    .eq('is_active', true)

  const unsigned = (pendingContracts ?? []).filter(c =>
    !c.contract_signatures?.some((s: { student_id: string }) => s.student_id === user.id)
  )

  // View retorna 1 linha por esporte (multi-sport) — não usar .single()
  const { data: trainingRows } = await supabase
    .from('v_trainings_since_belt')
    .select('sport, trainings_since_belt')
    .eq('student_id', user.id)

  const trainingsBySport = new Map(
    (trainingRows ?? []).map((row) => [
      row.sport as string,
      Number(row.trainings_since_belt ?? 0),
    ])
  )

  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      id, present_at, source,
      checkins!inner (class_id, classes ( name ))
    `)
    .eq('student_id', user.id)
    .order('present_at', { ascending: false })
    .limit(20)

  return (
    <AlunoHome
      firstName={profile.full_name?.trim().split(/\s+/)[0]}
      sportsData={sportsData}
      trainingsBySport={trainingsBySport}
      unsigned={unsigned}
      attendance={(recentAttendance ?? []) as unknown as RecentAttendance[]}
    />
  )
}
