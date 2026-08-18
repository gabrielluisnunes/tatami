import {
  loadProfessorAlunos,
  loadProfessorGraduacoes,
} from '@/lib/professor-students'

function mockAdmin(opts: {
  studentSports?: Array<{ student_id: string; sport: string; belt: string | null; degree: number }>
  profiles?: Array<{
    id: string
    full_name: string
    role?: string
    sport?: string | null
    belt?: string | null
    degree?: number | null
    phone?: string | null
    photo_url?: string | null
  }>
  graduacoes?: Array<{
    student_id: string
    full_name: string
    sport: string
    belt: string | null
    degree: number
    trainings_since_belt: number
    attendance_rate: number | null
    total_classes_since_belt: number
  }>
}) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'student_sports') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: opts.studentSports ?? [] }),
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(function (this: unknown, col: string) {
              if (col === 'role') {
                return {
                  in: jest.fn((inCol: string, val: unknown) => {
                    if (inCol === 'sport') {
                      return Promise.resolve({
                        data: (opts.profiles ?? []).map(p => ({ id: p.id })),
                      })
                    }
                    return {
                      order: jest.fn().mockResolvedValue({
                        data: (opts.profiles ?? []).filter(p =>
                          (val as string[]).includes(p.id),
                        ),
                      }),
                    }
                  }),
                }
              }
              return {
                eq: jest.fn().mockReturnValue({
                  in: jest.fn((inCol: string, val: unknown) => {
                    if (inCol === 'sport') {
                      return Promise.resolve({
                        data: (opts.profiles ?? []).map(p => ({ id: p.id })),
                      })
                    }
                    return {
                      order: jest.fn().mockResolvedValue({
                        data: (opts.profiles ?? []).filter(p =>
                          (val as string[]).includes(p.id),
                        ),
                      }),
                    }
                  }),
                }),
              }
            }),
          }),
        }
      }
      if (table === 'v_trainings_since_belt') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: opts.graduacoes ?? [] }),
              }),
            }),
          }),
        }
      }
      return { select: jest.fn() }
    }),
    storage: {
      from: jest.fn().mockReturnValue({
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/photo.jpg' } }),
      }),
    },
  }
}

describe('loadProfessorAlunos', () => {
  it('contagem bate com a lista renderizada', async () => {
    const admin = mockAdmin({
      studentSports: [
        { student_id: 's1', sport: 'jiu-jitsu', belt: 'azul', degree: 0 },
        { student_id: 's2', sport: 'jiu-jitsu', belt: 'branca', degree: 0 },
      ],
      profiles: [
        { id: 's1', full_name: 'Ana', role: 'aluno', sport: 'jiu-jitsu', belt: 'azul', degree: 0 },
        { id: 's2', full_name: 'Bruno', role: 'aluno', sport: 'jiu-jitsu', belt: 'branca', degree: 0 },
      ],
    })

    const alunos = await loadProfessorAlunos(admin as never, 'academy-1', ['jiu-jitsu'])
    expect(alunos).toHaveLength(2)
    expect(alunos.map(a => a.full_name)).toEqual(['Ana', 'Bruno'])
  })

  it('inclui aluno legado só em profiles', async () => {
    const admin = mockAdmin({
      studentSports: [],
      profiles: [
        { id: 's1', full_name: 'Carlos', role: 'aluno', sport: 'jiu-jitsu', belt: 'roxa', degree: 1 },
      ],
    })

    const alunos = await loadProfessorAlunos(admin as never, 'academy-1', ['jiu-jitsu'])
    expect(alunos).toHaveLength(1)
    expect(alunos[0].sports[0].belt).toBe('roxa')
  })
})

describe('loadProfessorGraduacoes', () => {
  it('contagem de linhas bate com registros retornados', async () => {
    const admin = mockAdmin({
      graduacoes: [
        {
          student_id: 's1',
          full_name: 'Ana',
          sport: 'jiu-jitsu',
          belt: 'azul',
          degree: 0,
          trainings_since_belt: 10,
          attendance_rate: 85,
          total_classes_since_belt: 12,
        },
        {
          student_id: 's1',
          full_name: 'Ana',
          sport: 'muay-thai',
          belt: 'branco',
          degree: 0,
          trainings_since_belt: 5,
          attendance_rate: 70,
          total_classes_since_belt: 8,
        },
      ],
      profiles: [],
    })

    const rows = await loadProfessorGraduacoes(admin as never, 'academy-1', ['jiu-jitsu', 'muay-thai'])
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map(r => r.id)).size).toBe(1)
  })
})
