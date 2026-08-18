import { BELT_LABELS, SPORT_LABELS, type StudentSportRow } from '@/lib/professor-sports'
import { cn } from '@/lib/utils'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
  azul: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa: 'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  preta: 'bg-zinc-900 text-white ring-1 ring-zinc-900',
  branco: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
}

interface Props {
  sports: StudentSportRow[]
  showSportLabel?: boolean
}

export function ProfessorSportBadges({ sports, showSportLabel = false }: Props) {
  if (sports.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 justify-end">
      {sports.map(ss => {
        const beltKey = ss.belt?.toLowerCase() ?? ''
        const beltCls = beltColors[beltKey] ?? 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200'

        if (ss.sport === 'boxe' || !ss.belt) {
          return (
            <span
              key={ss.sport}
              className="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600"
            >
              {SPORT_LABELS[ss.sport] ?? ss.sport}
            </span>
          )
        }

        return (
          <span
            key={ss.sport}
            className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium', beltCls)}
          >
            {showSportLabel && `${SPORT_LABELS[ss.sport] ?? ss.sport} · `}
            {BELT_LABELS[beltKey] ?? ss.belt}
            {ss.sport === 'jiu-jitsu' && ss.degree > 0 && (
              <span className="ml-1 tracking-tighter opacity-60">{'●'.repeat(ss.degree)}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
