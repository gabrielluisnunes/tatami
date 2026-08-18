import {
  getProfessorTeachingSports,
  sportsForProfessor,
  type StudentSportRow,
} from '@/lib/professor-sports'

function mockSupabase(opts: {
  classes?: Array<{ sport: string | null }>
  profileSport?: string | null
}) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'classes') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: opts.classes ?? [] }),
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { sport: opts.profileSport ?? null },
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    }),
  }
}

describe('getProfessorTeachingSports', () => {
  it('retorna esportes distintos das turmas do professor', async () => {
    const supabase = mockSupabase({
      classes: [{ sport: 'jiu-jitsu' }, { sport: 'muay-thai' }, { sport: 'jiu-jitsu' }],
    })

    const sports = await getProfessorTeachingSports(
      supabase as never,
      'prof-1',
      'academy-1',
      'professor',
    )

    expect(sports).toEqual(['jiu-jitsu', 'muay-thai'])
  })

  it('usa profiles.sport quando professor não tem turma', async () => {
    const supabase = mockSupabase({
      classes: [],
      profileSport: 'muay-thai',
    })

    const sports = await getProfessorTeachingSports(
      supabase as never,
      'prof-1',
      'academy-1',
      'professor',
    )

    expect(sports).toEqual(['muay-thai'])
  })

  it('admin sem turma usa sport do perfil ou retorna vazio', async () => {
    const supabase = mockSupabase({ classes: [], profileSport: 'muay-thai' })

    const sports = await getProfessorTeachingSports(
      supabase as never,
      'admin-1',
      'academy-1',
      'admin',
    )

    expect(sports).toEqual(['muay-thai'])
  })

  it('admin sem turma e sem sport no perfil retorna vazio', async () => {
    const supabase = mockSupabase({ classes: [], profileSport: null })

    const sports = await getProfessorTeachingSports(
      supabase as never,
      'admin-1',
      'academy-1',
      'admin',
    )

    expect(sports).toEqual([])
  })
})

describe('sportsForProfessor', () => {
  const map = new Map<string, StudentSportRow[]>([
    ['s1', [
      { sport: 'jiu-jitsu', belt: 'azul', degree: 1 },
      { sport: 'muay-thai', belt: 'branco', degree: 0 },
    ]],
  ])

  it('filtra apenas esportes que o professor ensina', () => {
    const result = sportsForProfessor('s1', ['jiu-jitsu'], map)
    expect(result).toEqual([{ sport: 'jiu-jitsu', belt: 'azul', degree: 1 }])
  })

  it('usa fallback de profiles quando não há student_sports', () => {
    const result = sportsForProfessor(
      's2',
      ['muay-thai'],
      map,
      { sport: 'muay-thai', belt: 'branco', degree: 0 },
    )
    expect(result).toEqual([{ sport: 'muay-thai', belt: 'branco', degree: 0 }])
  })
})
