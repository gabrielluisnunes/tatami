import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GraduationModal } from '@/components/dashboard/graduation-modal'
import { Award } from 'lucide-react'

interface StudentViewRecord {
  student_id: string
  full_name: string
  belt: string | null
  trainings_since_belt: number | null
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
    .select('student_id, full_name, belt, trainings_since_belt')
    .eq('academy_id', profile.academy_id)
    .order('full_name', { ascending: true })

  const students = ((raw as unknown as StudentViewRecord[]) ?? []).map(s => ({
    id:                   s.student_id,
    full_name:            s.full_name,
    belt:                 s.belt || 'branca',
    trainings_since_belt: s.trainings_since_belt || 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Graduações</h1>
        <p className="text-sm text-zinc-500">
          {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
        </p>
      </div>

      {students.length > 0 ? (
        <GraduationModal students={students} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Award className="h-8 w-8 mb-3 text-zinc-700" />
          <p className="text-zinc-500 text-sm">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
