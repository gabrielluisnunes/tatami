import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'
import { getProfessorTeachingSports, SPORT_LABELS } from '@/lib/professor-sports'
import { loadProfessorGraduacoes } from '@/lib/professor-students'
import { ProfessorSportBadges } from '@/components/professor/professor-sport-badges'

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

  const teachingSports = await getProfessorTeachingSports(
    supabase,
    user.id,
    profile.academy_id,
    profile.role,
  )

  const adminSupabase = createStorageAdminClient()
  const students = await loadProfessorGraduacoes(
    adminSupabase,
    profile.academy_id,
    teachingSports,
  )

  const uniqueStudentCount = new Set(students.map(s => s.id)).size
  const showSportColumn = teachingSports.length > 1
  const sportSummary = teachingSports.map(s => SPORT_LABELS[s]).join(', ')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Graduações</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {uniqueStudentCount} aluno{uniqueStudentCount !== 1 ? 's' : ''} na academia
          {students.length !== uniqueStudentCount && (
            <> · {students.length} graduaç{students.length !== 1 ? 'ões' : 'ão'}</>
          )}
          {teachingSports.length > 0 && (
            <> · {sportSummary}</>
          )}
        </p>
      </div>

      {teachingSports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center px-4">
          <p className="text-sm text-zinc-500">Nenhuma turma designada ainda.</p>
          <p className="text-xs text-zinc-400 mt-1">Peça ao administrador para vincular turmas ao seu perfil.</p>
        </div>
      ) : students.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Nome</th>
                {showSportColumn && (
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Esporte</th>
                )}
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Graduação</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Treinos</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Freq.</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={`${s.id}-${s.sport}`} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.full_name}</td>
                  {showSportColumn && (
                    <td className="px-4 py-3 text-zinc-600">
                      {SPORT_LABELS[s.sport] ?? s.sport}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <ProfessorSportBadges
                      sports={[{
                        sport: s.sport,
                        belt: s.sport === 'boxe' ? null : s.belt,
                        degree: s.degree,
                      }]}
                    />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Award className="h-6 w-6 mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-500">Nenhum aluno nos esportes das suas turmas.</p>
        </div>
      )}
    </div>
  )
}
