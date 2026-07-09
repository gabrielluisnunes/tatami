import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',
  azul:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-950 text-amber-200 ring-1 ring-amber-800',
  preta:  'bg-zinc-50 text-zinc-900 ring-1 ring-zinc-300',
}

interface StudentViewRecord {
  student_id:                string
  full_name:                 string
  belt:                      string | null
  degree:                    number | null
  trainings_since_belt:      number | null
  attendance_rate:           number | null
  total_classes_since_belt:  number | null
}

export default async function ProfessorGraduacoesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/auth/login')
  if (profile.role !== 'professor' && profile.role !== 'admin') redirect('/auth/login')

  const { data: raw } = await supabase
    .from('v_trainings_since_belt')
    .select('student_id, full_name, belt, degree, trainings_since_belt, attendance_rate, total_classes_since_belt')
    .eq('academy_id', profile.academy_id)
    .order('trainings_since_belt', { ascending: false })

  const students = ((raw as unknown as StudentViewRecord[]) ?? []).map(s => ({
    id:                        s.student_id,
    full_name:                 s.full_name,
    belt:                      s.belt || 'branca',
    degree:                    s.degree ?? 0,
    trainings_since_belt:      s.trainings_since_belt ?? 0,
    attendance_rate:           s.attendance_rate ?? 100,
    total_classes_since_belt:  s.total_classes_since_belt ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Graduações</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
        </p>
      </div>

      {students.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Faixa</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">Treinos na faixa</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Frequência</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-zinc-800/40 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-200">{s.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      beltColors[s.belt.toLowerCase()] ?? 'bg-zinc-700 text-zinc-300'
                    }`}>
                      {s.belt.charAt(0).toUpperCase() + s.belt.slice(1)}
                      {s.degree > 0 && (
                        <span className="tracking-tighter opacity-60">{'●'.repeat(s.degree)}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-400">
                    {s.trainings_since_belt}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      s.attendance_rate >= 80
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
                        : s.attendance_rate >= 60
                        ? 'text-amber-400 bg-amber-950/40 border-amber-800'
                        : 'text-red-400 bg-red-950/40 border-red-800'
                    }`}>
                      {s.attendance_rate.toFixed(1)}%
                    </span>
                    {s.attendance_rate < 80 && (
                      <p className="text-[10px] text-zinc-600 mt-0.5">Mínimo: 80%</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Award className="h-6 w-6 mb-2 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
