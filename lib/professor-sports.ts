import type { SupabaseClient } from '@supabase/supabase-js'

export type Sport = 'jiu-jitsu' | 'muay-thai' | 'boxe'

const VALID_SPORTS: Sport[] = ['jiu-jitsu', 'muay-thai', 'boxe']

export const SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  boxe: 'Boxe',
}

export const BELT_LABELS: Record<string, string> = {
  branca: 'Branca',
  azul: 'Azul',
  roxa: 'Roxa',
  marrom: 'Marrom',
  preta: 'Preta',
  branco: 'Branco',
  laranja: 'Laranja',
  'azul-mt': 'Azul',
  vermelho: 'Vermelho',
  amarelo: 'Amarelo',
  verde: 'Verde',
  'marrom-mt': 'Marrom',
  'preto-mt': 'Preto',
}

function isSport(value: string | null | undefined): value is Sport {
  return !!value && VALID_SPORTS.includes(value as Sport)
}

/** Esportes das turmas do professor; fallback em profiles.sport. Sem turma → vazio. */
export async function getProfessorTeachingSports(
  supabase: SupabaseClient,
  userId: string,
  academyId: string,
  role: string,
): Promise<Sport[]> {
  const { data: classes } = await supabase
    .from('classes')
    .select('sport')
    .eq('professor_id', userId)
    .eq('academy_id', academyId)

  const fromClasses = Array.from(
    new Set(
      (classes ?? [])
        .map(c => c.sport)
        .filter(isSport),
    ),
  )

  if (fromClasses.length > 0) return fromClasses

  if (role === 'professor' || role === 'admin') {
    const { data: profProfile } = await supabase
      .from('profiles')
      .select('sport')
      .eq('id', userId)
      .single()

    if (isSport(profProfile?.sport)) return [profProfile.sport]
  }

  return []
}

export interface StudentSportRow {
  sport: string
  belt: string | null
  degree: number
}

export function sportsForProfessor(
  studentId: string,
  teachingSports: Sport[],
  studentSportsMap: Map<string, StudentSportRow[]>,
  profileFallback?: { sport?: string | null; belt?: string | null; degree?: number | null },
): StudentSportRow[] {
  const all = studentSportsMap.get(studentId) ?? [{
    sport: profileFallback?.sport ?? 'jiu-jitsu',
    belt: profileFallback?.belt ?? null,
    degree: profileFallback?.degree ?? 0,
  }]

  return all.filter(s => teachingSports.includes(s.sport as Sport))
}
