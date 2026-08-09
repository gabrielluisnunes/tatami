import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const BELT_LABELS: Record<string, string> = {
  branca: 'Branca', azul: 'Azul', roxa: 'Roxa', marrom: 'Marrom', preta: 'Preta',
  branco: 'Branco', laranja: 'Laranja', 'azul-mt': 'Azul',
  vermelho: 'Vermelho', amarelo: 'Amarelo', verde: 'Verde',
  'marrom-mt': 'Marrom', 'preto-mt': 'Preto',
}

const SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  'boxe': 'Boxe',
}

export default async function AlunoGraduacoesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, belt, degree, full_name, created_at, belt_updated_at, sport')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const storageAdmin = createStorageAdminClient()

  // 1. Buscar todos os esportes do aluno
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

  // 2. Se todos são boxe, redirecionar
  if (sportsData.every(s => s.sport === 'boxe')) {
    redirect('/aluno/frequencia')
  }

  // 3. Para cada esporte não-boxe, buscar histórico
  const sportsWithHistory = await Promise.all(
    sportsData
      .filter(ss => ss.sport !== 'boxe')
      .map(async (ss) => {
        const { data: history } = await storageAdmin
          .from('belt_history')
          .select('id, belt, degree, graded_at, notes, trainings_at_graduation, sport')
          .eq('student_id', user.id)
          .eq('sport', ss.sport)
          .order('graded_at', { ascending: true })

        return {
          sport: ss.sport,
          belt: ss.belt,
          degree: ss.degree ?? 0,
          belt_updated_at: ss.belt_updated_at,
          history: history ?? [],
        }
      })
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Sua evolução</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Histórico de graduações</p>
      </div>

      <div className="space-y-8">
        {sportsWithHistory.map((ss) => (
          <div key={ss.sport} className="space-y-4">

            {/* Header do esporte — só mostrar se múltiplos */}
            {sportsWithHistory.length > 1 && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200" />
                <span className="text-sm font-semibold text-zinc-500">
                  {SPORT_LABELS[ss.sport]}
                </span>
                <div className="h-px flex-1 bg-zinc-200" />
              </div>
            )}

            {/* Card de faixa atual */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <p className="text-sm text-zinc-500">
                {ss.sport === 'muay-thai' ? 'Prajied atual' : 'Faixa atual'}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-2xl font-bold text-zinc-900">
                  {BELT_LABELS[ss.belt ?? ''] ?? ss.belt ?? '—'}
                </span>
                {ss.sport === 'jiu-jitsu' && ss.degree > 0 && (
                  <div className="flex gap-1">
                    {Array.from({ length: ss.degree }).map((_, i) => (
                      <div key={i}
                        className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    ))}
                  </div>
                )}
              </div>
              {ss.belt_updated_at && (
                <p className="text-xs text-zinc-500 mt-1">
                  Desde {new Date(ss.belt_updated_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            {/* Timeline de histórico */}
            {ss.history.length > 0 ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 mb-3">
                  Histórico de graduações
                </p>
                <div className="relative">
                  {/* Linha vertical da timeline */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-zinc-200" />

                  <div className="space-y-4">
                    {ss.history.map((item, idx) => (
                      <div key={item.id} className="flex gap-4 relative">
                        {/* Dot da timeline */}
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
                          idx === ss.history.length - 1
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-white border-zinc-300 text-zinc-400'
                        }`}>
                          <div className="h-2 w-2 rounded-full bg-current" />
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 pb-4">
                          <div className="rounded-xl border border-zinc-200 bg-white p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-zinc-900">
                                {BELT_LABELS[item.belt] ?? item.belt}
                                {ss.sport === 'jiu-jitsu' && item.degree > 0 && (
                                  <span className="text-zinc-500 ml-1 text-xs">
                                    {item.degree}° grau
                                  </span>
                                )}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {new Date(item.graded_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-zinc-500">{item.notes}</p>
                            )}
                            {item.trainings_at_graduation != null && (
                              <p className="text-xs text-zinc-500 mt-1">
                                {item.trainings_at_graduation} treinos nessa graduação
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
                <p className="text-sm text-zinc-500">
                  Nenhuma graduação registrada ainda.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
