import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Activity, AlertTriangle } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import Link from 'next/link'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',
  azul:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-950 text-amber-200 ring-1 ring-amber-800',
  preta:  'bg-zinc-50 text-zinc-900 ring-1 ring-zinc-300',
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
    .select('role, academy_id, belt, degree, belt_updated_at, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  // Buscar contratos pendentes de assinatura
  const { data: pendingContracts } = await supabase
    .from('contracts')
    .select(`
      id, title,
      contract_signatures!left (student_id)
    `)
    .eq('academy_id', profile.academy_id)
    .eq('is_active', true)

  const unsigned = (pendingContracts ?? []).filter(c =>
    !c.contract_signatures?.some((s: { student_id: string }) => s.student_id === user.id)
  )

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
      {unsigned.length > 0 && (
        <div className="space-y-2">
          {unsigned.map(contract => (
            <div
              key={contract.id}
              className="flex items-center justify-between rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-amber-200">Contrato pendente</p>
                  <p className="text-xs text-amber-400/80">{contract.title}</p>
                </div>
              </div>
              <Link
                href={`/aluno/contratos/${contract.id}`}
                className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
              >
                Assinar agora
              </Link>
            </div>
          ))}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Frequência</h1>
        <p className="text-sm text-zinc-500 mt-1">Seus treinos e presença</p>
      </div>

      {/* Card destaque: treinos desde última faixa */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 text-center space-y-3">
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-sm font-semibold ${beltColorCls}`}>
            Faixa {beltLabel}
            {(profile.degree ?? 0) > 0 && (
              <span className="tracking-tighter opacity-60">{'●'.repeat(profile.degree ?? 0)}</span>
            )}
          </span>
          {(profile.degree ?? 0) > 0 && (
            <span className="text-xs text-zinc-500">{profile.degree}º grau</span>
          )}
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
