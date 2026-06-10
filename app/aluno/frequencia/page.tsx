import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Activity } from 'lucide-react'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-200 text-zinc-900',
  azul:   'bg-blue-600 text-white',
  roxa:   'bg-purple-700 text-white',
  marrom: 'bg-amber-800 text-white',
  preta:  'bg-zinc-950 text-white border border-zinc-600',
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

interface RecentAttendance {
  id: string
  present_at: string
  source: string
  checkins: {
    class_id: string
    classes: {
      name: string
    } | null
  } | null
}

export default async function AlunoFrequenciaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, belt, belt_updated_at, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  // Treinos desde última faixa via view
  const { data: trainingSummary } = await supabase
    .from('v_trainings_since_belt')
    .select('trainings_since_belt')
    .eq('student_id', user.id)
    .single()

  const trainingsSinceBelt = trainingSummary?.trainings_since_belt ?? 0

  // Últimos 20 checkins do aluno com join na turma
  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      id,
      present_at,
      source,
      checkins!inner (
        class_id,
        classes ( name )
      )
    `)
    .eq('student_id', user.id)
    .order('present_at', { ascending: false })
    .limit(20)

  const beltLabel = profile.belt
    ? profile.belt.charAt(0).toUpperCase() + profile.belt.slice(1)
    : 'Branca'

  const beltColorCls = beltColors[profile.belt?.toLowerCase() ?? 'branca']
    ?? 'bg-zinc-700 text-zinc-200'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Frequência</h1>
        <p className="text-sm text-zinc-500 mt-1">Seus treinos e presença</p>
      </div>

      {/* Card destaque: treinos desde última faixa */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 text-center space-y-3">
        <div className="flex items-center justify-center">
          <span className={`rounded-full px-4 py-1 text-sm font-semibold ${beltColorCls}`}>
            Faixa {beltLabel}
          </span>
        </div>
        <div className="text-6xl font-black text-indigo-400">{trainingsSinceBelt}</div>
        <p className="text-sm text-zinc-400">treinos desde sua última graduação</p>
        {profile.belt_updated_at && (
          <p className="text-xs text-zinc-600">
            Graduado em {formatLocalDate(profile.belt_updated_at)}
          </p>
        )}
      </div>

      {/* Histórico de presenças */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Últimos treinos
        </h2>

        {!recentAttendance || recentAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-zinc-600">
            <Activity className="h-6 w-6 mb-2" />
            <p className="text-sm">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {((recentAttendance as unknown as RecentAttendance[]) ?? []).map((att) => {
              const className = att.checkins?.classes?.name ?? 'Treino'
              const date = new Date(att.present_at)
              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{className}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {date.toLocaleDateString('pt-BR', {
                        weekday: 'long', day: '2-digit', month: 'short'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-zinc-500">Presente</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
