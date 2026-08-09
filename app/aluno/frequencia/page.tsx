import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
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

const SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  'boxe': 'Boxe',
}

const beltColors: Record<string, string> = {
  branca:      'bg-zinc-200 text-zinc-800',
  azul:        'bg-blue-600 text-white',
  roxa:        'bg-purple-700 text-white',
  marrom:      'bg-amber-800 text-amber-100',
  preta:       'bg-zinc-900 text-white',
  branco:      'bg-zinc-200 text-zinc-800',
  laranja:     'bg-orange-500 text-white',
  'azul-mt':   'bg-blue-600 text-white',
  vermelho:    'bg-red-600 text-white',
  amarelo:     'bg-yellow-400 text-zinc-900',
  verde:       'bg-green-600 text-white',
  'marrom-mt': 'bg-amber-800 text-amber-100',
  'preto-mt':  'bg-zinc-900 text-white',
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

  const storageAdmin = createStorageAdminClient()
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

  const { data: pendingContracts } = await supabase
    .from('contracts')
    .select(`id, title, contract_signatures!left (student_id)`)
    .eq('academy_id', profile.academy_id)
    .eq('is_active', true)

  const unsigned = (pendingContracts ?? []).filter(c =>
    !c.contract_signatures?.some((s: { student_id: string }) => s.student_id === user.id)
  )

  // View retorna 1 linha por esporte (multi-sport) — não usar .single()
  const { data: trainingRows } = await supabase
    .from('v_trainings_since_belt')
    .select('sport, trainings_since_belt')
    .eq('student_id', user.id)

  const trainingsBySport = new Map(
    (trainingRows ?? []).map((row) => [
      row.sport as string,
      Number(row.trainings_since_belt ?? 0),
    ])
  )

  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      id, present_at, source,
      checkins!inner (class_id, classes ( name ))
    `)
    .eq('student_id', user.id)
    .order('present_at', { ascending: false })
    .limit(20)

  const primary = sportsData[0]
  const beltKey = primary.belt?.toLowerCase() ?? 'branca'
  const beltLabel = BELT_LABELS[beltKey] ?? (
    primary.belt ? primary.belt.charAt(0).toUpperCase() + primary.belt.slice(1) : 'Branca'
  )
  const beltColorCls = beltColors[beltKey] ?? 'bg-zinc-200 text-zinc-800'

  return (
    <div className="space-y-6">

      {/* Contratos pendentes de assinatura */}
      {unsigned.length > 0 && (
        <div className="space-y-2">
          {unsigned.map(contract => (
            <div
              key={contract.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 border-l-[3px] border-l-indigo-500 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">Contrato pendente</p>
                  <p className="text-xs text-zinc-500 truncate">{contract.title}</p>
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
        <h1 className="text-xl font-semibold text-zinc-900">Seus treinos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Frequência e evolução</p>
      </div>

      {/* Card faixa atual */}
      {sportsData.length === 1 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">
            {primary.sport === 'muay-thai' ? 'Prajied atual' : primary.sport === 'boxe' ? 'Esporte' : 'Faixa atual'}
          </p>
          <div className="flex items-center gap-3 mt-3">
            {primary.sport === 'boxe' ? (
              <span className="text-sm font-medium text-zinc-600">Boxe — sem graduação</span>
            ) : (
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${beltColorCls}`}>
                {primary.sport === 'muay-thai' ? 'Prajied' : 'Faixa'} {beltLabel}
                {primary.sport === 'jiu-jitsu' && (primary.degree ?? 0) > 0 && (
                  <span className="ml-1.5 opacity-60">{'●'.repeat(primary.degree ?? 0)}</span>
                )}
              </span>
            )}
          </div>
          {primary.sport === 'jiu-jitsu' && (primary.degree ?? 0) > 0 && (
            <p className="text-xs text-zinc-500 mt-1.5">{primary.degree}º grau</p>
          )}
          {primary.belt_updated_at && primary.sport !== 'boxe' && (
            <p className="text-xs text-zinc-500 mt-1">Desde {formatLocalDate(primary.belt_updated_at)}</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sportsData.map(ss => (
            <div key={ss.sport}
              className="rounded-xl border border-zinc-200 bg-white p-3">
              <p className="text-xs text-zinc-500">
                {SPORT_LABELS[ss.sport]}
              </p>
              {ss.sport !== 'boxe' ? (
                <>
                  <p className="text-sm font-semibold text-zinc-900 mt-1">
                    {BELT_LABELS[ss.belt ?? ''] ?? ss.belt ?? '—'}
                  </p>
                  {ss.sport === 'jiu-jitsu' && (ss.degree ?? 0) > 0 && (
                    <div className="flex gap-1 mt-1">
                      {Array.from({ length: ss.degree ?? 0 }).map((_, i) => (
                        <div key={i} className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">Sem graduação</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Card contador de treinos — 1 card por esporte no multi-sport */}
      {sportsData.length === 1 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500 mb-3">
            Treinos desde última graduação
          </p>
          <p className="text-5xl font-bold text-zinc-900 tabular-nums">
            {trainingsBySport.get(primary.sport) ?? 0}
          </p>
          <p className="text-sm text-zinc-500 mt-1">treinos realizados</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sportsData.map((ss) => (
            <div key={ss.sport} className="rounded-xl border border-zinc-200 bg-white p-4">
              <p className="text-xs text-zinc-500">
                {SPORT_LABELS[ss.sport] ?? ss.sport}
              </p>
              <p className="text-3xl font-bold text-zinc-900 tabular-nums mt-2">
                {trainingsBySport.get(ss.sport) ?? 0}
              </p>
              <p className="text-xs text-zinc-500 mt-1">desde a última graduação</p>
            </div>
          ))}
        </div>
      )}

      {/* Histórico de presenças */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Últimos treinos
        </h2>

        {!recentAttendance || recentAttendance.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
            <p className="text-sm text-zinc-500">Nenhum treino registrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {((recentAttendance as unknown as RecentAttendance[]) ?? []).map((att) => {
              const turmaName = att.checkins?.classes?.name ?? 'Treino'
              const date = new Date(att.present_at)
              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{turmaName}</p>
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
