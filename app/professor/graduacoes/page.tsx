import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
  azul:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  preta:  'bg-zinc-900 text-white ring-1 ring-zinc-900',
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
    attendance_rate:           s.attendance_rate ?? null,
    total_classes_since_belt:  s.total_classes_since_belt ?? 0,
  }))

  const uniqueStudentCount = new Set(students.map(s => s.id)).size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Graduações</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {uniqueStudentCount} aluno{uniqueStudentCount !== 1 ? 's' : ''} cadastrado{uniqueStudentCount !== 1 ? 's' : ''}
        </p>
      </div>

      {students.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Faixa</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Treinos na faixa</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Frequência</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.full_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      beltColors[s.belt.toLowerCase()] ?? 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200'
                    }`}>
                      {s.belt.charAt(0).toUpperCase() + s.belt.slice(1)}
                      {s.degree > 0 && (
                        <span className="tracking-tighter opacity-60">{'●'.repeat(s.degree)}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">
                    {s.trainings_since_belt}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                      s.attendance_rate != null
                        ? s.attendance_rate >= 80
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : s.attendance_rate >= 60
                          ? 'text-amber-700 bg-amber-50 border-amber-200'
                          : 'text-red-700 bg-red-50 border-red-200'
                        : 'text-zinc-500 bg-zinc-50 border-zinc-200'
                    }`}>
                      {s.attendance_rate != null ? `${s.attendance_rate.toFixed(1)}%` : '—'}
                    </span>
                    {s.attendance_rate != null && s.attendance_rate < 80 && (
                      <p className="text-[10px] text-zinc-500 mt-0.5">Mínimo: 80%</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Award className="h-6 w-6 mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
