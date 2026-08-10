import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GraduacoesClient } from '@/components/dashboard/graduacoes-client'
import { Award } from 'lucide-react'

interface StudentViewRecord {
  student_id:                string
  full_name:                 string
  belt:                      string | null
  degree:                    number | null
  trainings_since_belt:      number | null
  attendance_rate:           number | null
  total_classes_since_belt:  number | null
  sport:                     string | null
}

export default async function GraduacoesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'admin') redirect('/dashboard')

  // 1 linha por aluno×esporte — service role bypassa RLS
  const storageAdmin = createStorageAdminClient()

  // Alunos legados (pré multi-sport) podem existir só em profiles.
  // v_trainings_since_belt parte de student_sports — sem row o aluno some da lista.
  const [{ data: academyAlunos }, { data: existingSports }] = await Promise.all([
    storageAdmin
      .from('profiles')
      .select('id, sport, belt, degree, created_at')
      .eq('academy_id', profile.academy_id)
      .eq('role', 'aluno'),
    storageAdmin
      .from('student_sports')
      .select('student_id, sport')
      .eq('academy_id', profile.academy_id),
  ])

  const existingKeys = new Set(
    (existingSports ?? []).map(s => `${s.student_id}:${s.sport}`)
  )
  const missingSports = (academyAlunos ?? [])
    .map(aluno => {
      const sport = ['jiu-jitsu', 'muay-thai', 'boxe'].includes(aluno.sport ?? '')
        ? (aluno.sport as string)
        : 'jiu-jitsu'
      return { aluno, sport }
    })
    .filter(({ aluno, sport }) => !existingKeys.has(`${aluno.id}:${sport}`))
    .map(({ aluno, sport }) => ({
      student_id: aluno.id,
      academy_id: profile.academy_id,
      sport,
      belt: sport === 'boxe'
        ? null
        : (aluno.belt ?? (sport === 'jiu-jitsu' ? 'branca' : 'branco')),
      degree: sport === 'jiu-jitsu' ? (aluno.degree ?? 0) : 0,
      created_at: aluno.created_at ?? new Date().toISOString(),
    }))

  if (missingSports.length > 0) {
    await storageAdmin.from('student_sports').insert(missingSports)
  }

  const { data: raw } = await storageAdmin
    .from('v_trainings_since_belt')
    .select('student_id, full_name, belt, degree, trainings_since_belt, attendance_rate, total_classes_since_belt, sport')
    .eq('academy_id', profile.academy_id)
    .order('full_name', { ascending: true })

  const students = ((raw as unknown as StudentViewRecord[]) ?? []).map(s => ({
    id:                        s.student_id,
    full_name:                 s.full_name,
    belt:                      s.belt ?? 'branca',
    degree:                    s.degree ?? 0,
    sport:                     s.sport ?? 'jiu-jitsu',
    trainings_since_belt:      s.trainings_since_belt ?? 0,
    attendance_rate:           s.attendance_rate ?? null,
    total_classes_since_belt:  s.total_classes_since_belt ?? 0,
  }))

  const uniqueStudentCount = new Set(students.map(s => s.id)).size

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg lg:text-xl font-semibold text-zinc-900">Graduações</h1>
        <p className="text-sm text-gray-400">
          {uniqueStudentCount} aluno{uniqueStudentCount !== 1 ? 's' : ''} cadastrado{uniqueStudentCount !== 1 ? 's' : ''}
        </p>
      </div>

      {students.length > 0 ? (
        <GraduacoesClient students={students} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Award className="h-8 w-8 mb-3 text-gray-400" />
          <p className="text-gray-400 text-sm">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
