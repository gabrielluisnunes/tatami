import { AlertTriangle, ArrowUpRight, CalendarDays, Check, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatLocalDate } from '@/lib/format-date'

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

export interface RecentAttendance {
  id: string
  present_at: string
  checkins: { classes: { name: string } | null } | null
}

interface AlunoHomeProps {
  firstName?: string
  sportsData: { sport: string; belt: string | null; degree: number | null; belt_updated_at: string | null }[]
  trainingsBySport: ReadonlyMap<string, number>
  unsigned: { id: string; title: string }[]
  attendance: RecentAttendance[]
}

export function AlunoHome({ firstName, sportsData, trainingsBySport, unsigned, attendance }: AlunoHomeProps) {
  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-zinc-950 px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-10 -top-14 size-52 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Meu tatame</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {firstName ? `Olá, ${firstName}!` : 'Olá!'}
          </h1>
          <p className="mt-2 text-sm text-zinc-300">Acompanhe sua evolução, treino por treino.</p>
          <a href="#ultimos-treinos" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 hover:bg-indigo-100">
            <CalendarDays aria-hidden="true" className="size-4" />
            Ver últimos treinos
          </a>
        </div>
      </header>

      {unsigned.map(contract => (
        <div key={contract.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">Contrato pendente</p>
            <p className="break-words text-xs text-zinc-700">{contract.title}</p>
          </div>
          <Link href={`/aluno/contratos/${contract.id}`} className="inline-flex min-h-11 items-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-700">
            Assinar
          </Link>
        </div>
      ))}

      <section aria-labelledby="evolucao" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <h2 id="evolucao" className="text-lg font-bold tracking-tight text-zinc-950">Sua evolução</h2>
          {sportsData.some(({ sport }) => sport !== 'boxe') && (
            <Link href="/aluno/graduacoes" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline">
              Graduações <ArrowUpRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>

        {sportsData.map(({ sport, belt, degree, belt_updated_at }) => {
          const beltKey = belt?.toLowerCase() ?? ''
          const beltLabel = BELT_LABELS[beltKey] ?? belt
          const beltColor = beltColors[beltKey] ?? 'bg-zinc-200 text-zinc-800'
          const trainingCount = trainingsBySport.get(sport)

          return (
            <div key={sport} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-900">{SPORT_LABELS[sport] ?? sport}</h3>
                {sport !== 'boxe' && beltLabel && (
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${beltColor}`}>
                    {sport === 'muay-thai' ? 'Prajied' : 'Faixa'} {beltLabel}
                    {sport === 'jiu-jitsu' && (degree ?? 0) > 0 ? ` · ${degree}º grau` : ''}
                  </span>
                )}
              </div>
              {sport === 'boxe' && <p className="mt-3 text-sm text-zinc-600">Modalidade sem graduação</p>}
              {(sport !== 'boxe' || trainingCount !== undefined) && (
                <>
                  <div className="mt-4 flex items-center gap-3">
                    <TrendingUp aria-hidden="true" className="size-5 shrink-0 text-indigo-700" />
                    <p className="text-3xl font-bold tabular-nums text-zinc-950">{trainingCount ?? '—'}</p>
                    <p className="text-sm text-zinc-600">{sport === 'boxe' ? 'Treinos registrados' : 'Treinos desde a última graduação'}</p>
                  </div>
                  {sport !== 'boxe' && belt_updated_at && <p className="mt-2 text-xs text-zinc-600">Graduação em {formatLocalDate(belt_updated_at)}</p>}
                </>
              )}
            </div>
          )
        })}
      </section>

      <section id="ultimos-treinos" aria-labelledby="titulo-treinos" className="scroll-mt-20 space-y-3">
        <h2 id="titulo-treinos" className="text-lg font-bold tracking-tight text-zinc-950">Últimos treinos</h2>
        {attendance.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center">
            <p className="text-sm font-medium text-zinc-900">Nenhum treino registrado ainda.</p>
            <p className="mt-1 text-sm text-zinc-600">Suas presenças aparecem aqui após o registro pela academia.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            {attendance.map((att) => (
              <li key={att.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-zinc-900">{att.checkins?.classes?.name ?? 'Treino'}</p>
                  <time dateTime={att.present_at} className="text-xs text-zinc-600">{formatLocalDate(att.present_at)}</time>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                  <Check aria-hidden="true" className="size-3" /> Presente
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
