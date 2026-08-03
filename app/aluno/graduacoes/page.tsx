import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Award } from 'lucide-react'

const beltConfig: Record<string, { dot: string; badge: string; label: string }> = {
  branca:      { dot: 'bg-zinc-700',   badge: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',        label: 'Branca'   },
  azul:        { dot: 'bg-blue-600',   badge: 'bg-blue-600 text-white ring-1 ring-blue-500',           label: 'Azul'     },
  roxa:        { dot: 'bg-purple-700', badge: 'bg-purple-700 text-white ring-1 ring-purple-600',       label: 'Roxa'     },
  marrom:      { dot: 'bg-amber-800',  badge: 'bg-amber-800 text-amber-100 ring-1 ring-amber-700',     label: 'Marrom'   },
  preta:       { dot: 'bg-zinc-100',   badge: 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300',        label: 'Preta'    },
  branco:      { dot: 'bg-zinc-700',   badge: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',        label: 'Branco'   },
  laranja:     { dot: 'bg-orange-600', badge: 'bg-orange-500 text-white ring-1 ring-orange-400',       label: 'Laranja'  },
  'azul-mt':   { dot: 'bg-blue-600',   badge: 'bg-blue-600 text-white ring-1 ring-blue-500',           label: 'Azul'     },
  vermelho:    { dot: 'bg-red-600',    badge: 'bg-red-600 text-white ring-1 ring-red-500',             label: 'Vermelho' },
  amarelo:     { dot: 'bg-yellow-500', badge: 'bg-yellow-400 text-zinc-900 ring-1 ring-yellow-300',    label: 'Amarelo'  },
  verde:       { dot: 'bg-green-600',  badge: 'bg-green-600 text-white ring-1 ring-green-500',         label: 'Verde'    },
  'marrom-mt': { dot: 'bg-amber-800',  badge: 'bg-amber-800 text-amber-100 ring-1 ring-amber-700',     label: 'Marrom'   },
  'preto-mt':  { dot: 'bg-zinc-100',   badge: 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-300',        label: 'Preto'    },
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

function attendanceColor(rate: number | null): string {
  if (rate == null) return 'text-zinc-400 bg-zinc-800 border-zinc-700'
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
  profiles: { full_name: string } | null
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
  if (profile.sport === 'boxe') redirect('/aluno/frequencia')

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

  const beltSince = profile.belt_updated_at ?? profile.created_at
  const { count: totalClassesSinceBelt } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', profile.academy_id)
    .eq('status', 'confirmed')
    .gt('checked_in_at', beltSince)

  const attendanceTimestamps = (attendanceData ?? []).map(a => new Date(a.present_at).getTime())

  const beltSinceMs = new Date(beltSince).getTime()
  const trainingsCount = attendanceTimestamps.filter(t => t >= beltSinceMs).length

  const attendanceRate = (totalClassesSinceBelt ?? 0) === 0
    ? null
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
    <div className="px-4 pt-8 pb-24 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Graduações</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">Sua evolução</h1>
      </div>

      {/* Card faixa atual */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-5 border border-zinc-700 flex items-center gap-4">
        <div className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${currentBeltCfg.badge}`}>
          <Award className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {profile.sport === 'muay-thai' ? 'Prajied atual' : 'Faixa atual'}
          </p>
          <p className="text-xl font-black text-zinc-100 mt-0.5">
            {currentBeltCfg.label}
            {profile.sport === 'jiu-jitsu' && (profile.degree ?? 0) > 0 && (
              <span className="ml-2 text-base font-bold tracking-tighter opacity-50">
                {'●'.repeat(profile.degree ?? 0)}
              </span>
            )}
          </p>
          {profile.sport === 'jiu-jitsu' && (profile.degree ?? 0) > 0 && (
            <p className="text-xs text-zinc-500">{profile.degree}º grau</p>
          )}
          <p className="text-xs text-zinc-600 mt-0.5">
            Desde {formatLocalDate(profile.belt_updated_at ?? profile.created_at)}
          </p>
          <div className="mt-1.5">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attendanceColor(attendanceRate)}`}>
              {attendanceRate != null ? `${attendanceRate.toFixed(1)}%` : '—'} de frequência
            </span>
            {attendanceRate != null && attendanceRate < 80 && (
              <span className="ml-2 text-xs text-zinc-500">mínimo 80% para graduar</span>
            )}
          </div>
        </div>
      </div>

      {/* Timeline de graduações */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Histórico
        </h2>

        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12 text-center">
            <Award className="h-6 w-6 mb-2 text-zinc-700" />
            <p className="text-sm text-zinc-600">Nenhuma graduação registrada ainda.</p>
          </div>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-zinc-800" />

            <div className="space-y-4">
              {historyWithPeriod.map((item, idx) => {
                const cfg = getBeltConfig(item.belt)
                const isLatest = idx === 0
                return (
                  <div key={item.id} className="relative flex gap-4">
                    <div className={`relative z-10 mt-1 h-4 w-4 flex-shrink-0 rounded-full border-2 border-zinc-950 ${cfg.dot}`} />

                    <div className={`flex-1 rounded-xl border p-4 space-y-2 ${
                      isLatest
                        ? 'border-indigo-500/30 bg-indigo-950/20'
                        : 'border-zinc-800 bg-zinc-900'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                          {profile.sport === 'muay-thai' ? 'Prajied' : 'Faixa'} {cfg.label}
                          {profile.sport === 'jiu-jitsu' && item.degree > 0 && (
                            <span className="tracking-tighter opacity-60">{'●'.repeat(item.degree)}</span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 shrink-0">
                          {formatLocalDate(item.graded_at)}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-500">
                        {item.trainings_in_period} treino{item.trainings_in_period !== 1 ? 's' : ''} nesse período
                      </p>

                      {profile.sport === 'jiu-jitsu' && item.degree > 0 && (
                        <p className="text-xs text-zinc-500">{item.degree}º grau</p>
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
