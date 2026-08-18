import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getProfessorTeachingSports, SPORT_LABELS } from '@/lib/professor-sports'
import { loadProfessorAlunos } from '@/lib/professor-students'
import { ProfessorSportBadges } from '@/components/professor/professor-sport-badges'

export default async function ProfessorAlunosPage() {
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
  const alunos = await loadProfessorAlunos(
    adminSupabase,
    profile.academy_id,
    teachingSports,
  )

  const sportSummary = teachingSports.map(s => SPORT_LABELS[s]).join(', ')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Alunos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} na academia
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
      ) : alunos.length > 0 ? (
        <div className="space-y-2">
          {alunos.map(aluno => {
            const initials = aluno.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() ?? '?'

            return (
              <div
                key={aluno.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                {aluno.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={aluno.photo_url}
                    alt={aluno.full_name}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 ring-1 ring-zinc-200">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{aluno.full_name}</p>
                  {aluno.phone && (
                    <p className="text-xs text-zinc-500 truncate">{aluno.phone}</p>
                  )}
                </div>
                <ProfessorSportBadges
                  sports={aluno.sports}
                  showSportLabel={teachingSports.length > 1}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-sm text-zinc-500">Nenhum aluno nos esportes das suas turmas.</p>
        </div>
      )}
    </div>
  )
}
