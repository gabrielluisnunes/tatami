import { createClient } from '@/lib/supabase/server'
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

  // Busca alunos com treinos desde última faixa via view
  const { data: raw } = await supabase
    .from('v_trainings_since_belt')
    .select('student_id, full_name, belt, degree, trainings_since_belt, attendance_rate, total_classes_since_belt')
    .eq('academy_id', profile.academy_id)
    .order('full_name', { ascending: true })

  const students = ((raw as unknown as StudentViewRecord[]) ?? []).map(s => ({
    id:                        s.student_id,
    full_name:                 s.full_name,
    belt:                      s.belt || 'branca',
    degree:                    s.degree ?? 0,
    trainings_since_belt:      s.trainings_since_belt || 0,
    attendance_rate:           s.attendance_rate ?? 100,
    total_classes_since_belt:  s.total_classes_since_belt ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Graduações</h1>
        <p className="text-sm text-gray-400">
          {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
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
