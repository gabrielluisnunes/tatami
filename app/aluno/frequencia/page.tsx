import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import Link from 'next/link'

const BELT_LABELS: Record<string, string> = {
  branca: 'Branca', azul: 'Azul', roxa: 'Roxa', marrom: 'Marrom', preta: 'Preta',
  branco: 'Branco', laranja: 'Laranja', 'azul-mt': 'Azul',
  vermelho: 'Vermelho', amarelo: 'Amarelo', verde: 'Verde',
  'marrom-mt': 'Marrom', 'preto-mt': 'Preto',
}

const beltColors: Record<string, string> = {
  branca:      'bg-zinc-700 text-zinc-100',
  azul:        'bg-blue-600 text-white',
  roxa:        'bg-purple-700 text-white',
  marrom:      'bg-amber-800 text-amber-100',
  preta:       'bg-zinc-100 text-zinc-900',
  branco:      'bg-zinc-700 text-zinc-100',
  laranja:     'bg-orange-500 text-white',
  'azul-mt':   'bg-blue-600 text-white',
  vermelho:    'bg-red-600 text-white',
  amarelo:     'bg-yellow-400 text-zinc-900',
  verde:       'bg-green-600 text-white',
  'marrom-mt': 'bg-amber-800 text-amber-100',
  'preto-mt':  'bg-zinc-100 text-zinc-900',
}

interface RecentAttendance {
  id: string
  present_at: string
  source: string
  checkins: {
    class_id: string
    classes: { name: string } | null
  } | null
}

export default async function AlunoFrequenciaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, belt, degree, belt_updated_at, full_name, sport')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const { data: pendingContracts } = await supabase
    .from('contracts')
    .select(`id, title, contract_signatures!left (student_id)`)
    .eq('academy_id', profile.academy_id)
    .eq('is_active', true)

  const unsigned = (pendingContracts ?? []).filter(c =>
    !c.contract_signatures?.some((s: { student_id: string }) => s.student_id === user.id)
  )

  const { data: trainingSummary } = await supabase
    .from('v_trainings_since_belt')
    .select('trainings_since_belt')
    .eq('student_id', user.id)
    .single()

  const trainingsSinceBelt = trainingSummary?.trainings_since_belt ?? 0

  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      id, present_at, source,
      checkins!inner (class_id, classes ( name ))
    `)
    .eq('student_id', user.id)
    .order('present_at', { ascending: false })
    .limit(20)

  const beltKey = profile.belt?.toLowerCase() ?? 'branca'
  const beltLabel = BELT_LABELS[beltKey] ?? (
    profile.belt ? profile.belt.charAt(0).toUpperCase() + profile.belt.slice(1) : 'Branca'
  )
  const beltColorCls = beltColors[beltKey] ?? 'bg-zinc-700 text-zinc-100'

  return (
    <div className="px-4 pt-8 pb-24 space-y-5">

      {/* Contratos pendentes de assinatura */}
      {unsigned.length > 0 && (
        <div className="space-y-2">
          {unsigned.map(contract => (
            <div
              key={contract.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 border-l-2 border-l-indigo-500 bg-zinc-900 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100">Contrato pendente</p>
                  <p className="text-xs text-zinc-400 truncate">{contract.title}</p>
                </div>
              </div>
              <Link
                href={`/aluno/contratos/${contract.id}`}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                Assinar
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Cabeçalho */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Frequência</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">Seus treinos</h1>
      </div>

      {/* Card faixa atual */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-5 border border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          {profile.sport === 'muay-thai' ? 'Prajied atual' : 'Faixa atual'}
        </p>
        <div className="flex items-center gap-3 mt-3">
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${beltColorCls}`}>
            {profile.sport === 'muay-thai' ? 'Prajied' : 'Faixa'} {beltLabel}
            {profile.sport === 'jiu-jitsu' && (profile.degree ?? 0) > 0 && (
              <span className="ml-1.5 opacity-60">{'●'.repeat(profile.degree ?? 0)}</span>
            )}
          </span>
        </div>
        {profile.sport === 'jiu-jitsu' && (profile.degree ?? 0) > 0 && (
          <p className="text-xs text-zinc-500 mt-1.5">{profile.degree}º grau</p>
        )}
        {profile.belt_updated_at && (
          <p className="text-xs text-zinc-500 mt-1">Desde {formatLocalDate(profile.belt_updated_at)}</p>
        )}
      </div>

      {/* Card contador de treinos */}
      <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
          Treinos desde última graduação
        </p>
        <p className="text-5xl font-bold text-zinc-100 tabular-nums">{trainingsSinceBelt}</p>
        <p className="text-sm text-zinc-500 mt-1">treinos realizados</p>
      </div>

      {/* Histórico de presenças */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Últimos treinos
        </h2>

        {!recentAttendance || recentAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-12 text-center">
            <p className="text-sm text-zinc-600">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {((recentAttendance as unknown as RecentAttendance[]) ?? []).map((att) => {
              const turmaName = att.checkins?.classes?.name ?? 'Treino'
              const date = new Date(att.present_at)
              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{turmaName}</p>
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
