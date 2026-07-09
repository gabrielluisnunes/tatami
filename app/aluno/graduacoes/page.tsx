import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'

const beltConfig: Record<string, { dot: string; badge: string; label: string }> = {
  branca: { dot: 'bg-zinc-700',    badge: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700', label: 'Branca'  },
  azul:   { dot: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200', label: 'Azul'    },
  roxa:   { dot: 'bg-purple-700',  badge: 'bg-purple-100 text-purple-800 ring-1 ring-purple-200', label: 'Roxa'    },
  marrom: { dot: 'bg-amber-800',   badge: 'bg-amber-950 text-amber-200 ring-1 ring-amber-800', label: 'Marrom'  },
  preta:  { dot: 'bg-zinc-50',    badge: 'bg-zinc-50 text-zinc-900 ring-1 ring-zinc-300', label: 'Preta' },
}

function getBeltConfig(belt: string) {
  return beltConfig[belt?.toLowerCase()] ?? {
    dot: 'bg-zinc-600',
    badge: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',
    label: belt ?? 'Desconhecida',
  }
}

function formatLocalDate(dateStr: string) {
  if (!dateStr) return '—'
  if (dateStr.includes('T') || dateStr.includes(':')) {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

function attendanceColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800'
  if (rate >= 60) return 'text-amber-400 bg-amber-950/40 border-amber-800'
  return 'text-red-400 bg-red-950/40 border-red-800'
}

interface BeltHistoryItem {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  profiles: {
    full_name: string
  } | null
}

export default async function AlunoGraduacoesPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, belt, degree, full_name, created_at, belt_updated_at')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const { data: history } = await supabase
    .from('belt_history')
    .select('id, belt, degree, graded_at, notes, trainings_at_graduation, profiles!belt_history_graded_by_fkey(full_name)')
    .eq('student_id', user.id)
    .order('graded_at', { ascending: false })

  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('present_at')
    .eq('student_id', user.id)
    .order('present_at', { ascending: true })

  // Total de aulas confirmadas da academia desde a última graduação (denominador)
  const beltSince = profile.belt_updated_at ?? profile.created_at
  const { count: totalClassesSinceBelt } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', profile.academy_id)
    .eq('status', 'confirmed')
    .gt('checked_in_at', beltSince)

  const attendanceTimestamps = (attendanceData ?? []).map(a => new Date(a.present_at).getTime())

  // Treinos do aluno desde a última graduação (numerador)
  const beltSinceMs = new Date(beltSince).getTime()
  const trainingsCount = attendanceTimestamps.filter(t => t >= beltSinceMs).length

  // % de frequência: 100% se não houve aulas confirmadas ainda
  const attendanceRate = (totalClassesSinceBelt ?? 0) === 0
    ? 100
    : Math.round((trainingsCount / (totalClassesSinceBelt ?? 1)) * 1000) / 10

  const historyTyped = (history as unknown as BeltHistoryItem[]) ?? []

  const historyWithPeriod = historyTyped.map((item, idx) => {
    const periodStart = new Date(item.graded_at).getTime()
    const periodEnd   = idx === 0
      ? Date.now()
      : new Date(historyTyped[idx - 1].graded_at).getTime()
    const trainings_in_period = attendanceTimestamps.filter(
      t => t >= periodStart && t < periodEnd
    ).length
    return { ...item, trainings_in_period }
  })

  const currentBeltCfg = getBeltConfig(profile.belt ?? 'branca')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Graduações</h1>
        <p className="text-sm text-zinc-500 mt-1">Sua evolução no tatame</p>
      </div>

      {/* Faixa atual destaque */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 flex items-center gap-5">
        <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl ${currentBeltCfg.badge}`}>
          <Award className="h-8 w-8" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Faixa atual</p>
          <p className="text-2xl font-black text-zinc-100 mt-0.5">
            {currentBeltCfg.label}
            {(profile.degree ?? 0) > 0 && (
              <span className="ml-2 text-lg font-bold tracking-tighter opacity-50">
                {'●'.repeat(profile.degree ?? 0)}
              </span>
            )}
          </p>
          {(profile.degree ?? 0) > 0 && (
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.degree}º grau
            </p>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">
            Desde {formatLocalDate(profile.belt_updated_at ?? profile.created_at)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attendanceColor(attendanceRate)}`}>
              {attendanceRate.toFixed(1)}% de frequência
            </span>
            {attendanceRate < 80 && (
              <span className="text-xs text-zinc-500">
                (mínimo 80% para graduar)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de graduações */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Histórico
        </h2>

        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-zinc-600">
            <Award className="h-6 w-6 mb-2" />
            <p className="text-sm">Nenhuma graduação registrada ainda.</p>
          </div>
        ) : (
          <div className="relative pl-5">
            {/* Linha vertical da timeline */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-800" />

            <div className="space-y-4">
              {historyWithPeriod.map((item) => {
                const cfg = getBeltConfig(item.belt)
                return (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Dot */}
                    <div className={`relative z-10 mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 border-zinc-950 ${cfg.dot}`} />

                    {/* Card */}
                    <div className="flex-1 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                          Faixa {cfg.label}
                          {item.degree > 0 && (
                            <span className="tracking-tighter opacity-60">{'●'.repeat(item.degree)}</span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatLocalDate(item.graded_at)}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500">
                        {item.trainings_in_period} treino{item.trainings_in_period !== 1 ? 's' : ''} nesse período
                      </p>

                      {item.degree > 0 && (
                        <p className="text-xs text-zinc-500">
                          {item.degree}º grau
                        </p>
                      )}

                      {item.profiles?.full_name && (
                        <p className="text-xs text-zinc-600">
                          Graduado por {item.profiles.full_name}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-xs text-zinc-400 italic border-t border-zinc-800 pt-2">
                          {`"${item.notes}"`}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
