import {
  getGraduationHistory,
  registerGraduation,
} from '@/lib/services/graduations.service'
import * as graduationsRepo from '@/lib/repositories/graduations.repository'

jest.mock('@/lib/repositories/graduations.repository')

const repo = graduationsRepo as jest.Mocked<typeof graduationsRepo>

const supabase = {} as never
const adminSupabase = {} as never

describe('graduations.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('registerGraduation', () => {
    const baseInput = {
      studentId: 'stu-1',
      academyId: 'academy-1',
      gradedBy: 'admin-1',
      belt: 'azul',
      degree: 1,
      sport: 'jiu-jitsu' as const,
    }

    it('rejeita boxe', async () => {
      const result = await registerGraduation(supabase, adminSupabase, {
        ...baseInput,
        sport: 'boxe',
        belt: 'branco',
      })

      expect(result).toEqual({
        ok: false,
        error: 'boxe_no_graduation',
        message: 'Boxe não possui graduação',
      })
      expect(repo.findStudentSportProfile).not.toHaveBeenCalled()
    })

    it('retorna student_not_found quando aluno não existe', async () => {
      repo.findStudentSportProfile.mockResolvedValue({ data: null, error: null } as never)

      const result = await registerGraduation(supabase, adminSupabase, baseInput)

      expect(result).toEqual({ ok: false, error: 'student_not_found' })
    })

    it('retorna sport_not_found quando esporte não existe', async () => {
      repo.findStudentSportProfile.mockResolvedValue({
        data: { id: 'stu-1', sport: 'jiu-jitsu' },
        error: null,
      } as never)
      repo.findStudentSport.mockResolvedValue({ data: null, error: null } as never)

      const result = await registerGraduation(supabase, adminSupabase, baseInput)

      expect(result).toEqual({ ok: false, error: 'sport_not_found' })
    })

    it('rejeita grau que não avança na mesma faixa', async () => {
      repo.findStudentSportProfile.mockResolvedValue({
        data: { id: 'stu-1', sport: 'jiu-jitsu' },
        error: null,
      } as never)
      repo.findStudentSport.mockResolvedValue({
        data: { sport: 'jiu-jitsu', belt: 'azul', degree: 2 },
        error: null,
      } as never)

      const result = await registerGraduation(supabase, adminSupabase, {
        ...baseInput,
        belt: 'azul',
        degree: 1,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('degree_not_advancing')
      }
      expect(repo.insertBeltHistory).not.toHaveBeenCalled()
    })

    it('promove e sincroniza profiles quando é o esporte principal', async () => {
      repo.findStudentSportProfile.mockResolvedValue({
        data: { id: 'stu-1', sport: 'jiu-jitsu' },
        error: null,
      } as never)
      repo.findStudentSport.mockResolvedValue({
        data: { sport: 'jiu-jitsu', belt: 'branca', degree: 0 },
        error: null,
      } as never)
      repo.insertBeltHistory.mockResolvedValue({ error: null } as never)
      repo.updateStudentSportBelt.mockResolvedValue({ error: null } as never)
      repo.updateProfileBelt.mockResolvedValue({ error: null } as never)

      const result = await registerGraduation(supabase, adminSupabase, baseInput)

      expect(result).toEqual({ ok: true })
      expect(repo.insertBeltHistory).toHaveBeenCalledWith(
        adminSupabase,
        expect.objectContaining({
          student_id: 'stu-1',
          belt: 'azul',
          degree: 1,
          sport: 'jiu-jitsu',
        }),
      )
      expect(repo.updateStudentSportBelt).toHaveBeenCalled()
      expect(repo.updateProfileBelt).toHaveBeenCalledWith(
        supabase,
        'stu-1',
        'azul',
        1,
        expect.any(String),
      )
    })

    it('não sincroniza profiles quando o esporte é secundário', async () => {
      repo.findStudentSportProfile.mockResolvedValue({
        data: { id: 'stu-1', sport: 'jiu-jitsu' },
        error: null,
      } as never)
      repo.findStudentSport.mockResolvedValue({
        data: { sport: 'muay-thai', belt: 'branco', degree: 0 },
        error: null,
      } as never)
      repo.insertBeltHistory.mockResolvedValue({ error: null } as never)
      repo.updateStudentSportBelt.mockResolvedValue({ error: null } as never)

      const result = await registerGraduation(supabase, adminSupabase, {
        ...baseInput,
        sport: 'muay-thai',
        belt: 'laranja',
        degree: 0,
      })

      expect(result).toEqual({ ok: true })
      expect(repo.updateProfileBelt).not.toHaveBeenCalled()
      expect(repo.insertBeltHistory).toHaveBeenCalledWith(
        adminSupabase,
        expect.objectContaining({
          sport: 'muay-thai',
          degree: 0,
        }),
      )
    })
  })

  describe('getGraduationHistory', () => {
    it('retorna history vazio para boxe', async () => {
      repo.findStudentHistoryProfile.mockResolvedValue({
        data: {
          id: 'stu-1',
          full_name: 'Ana',
          belt: 'branca',
          degree: 0,
          photo_url: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      } as never)
      repo.findStudentSportMaybe.mockResolvedValue({
        data: { sport: 'boxe', belt: null, degree: 0 },
        error: null,
      } as never)

      const result = await getGraduationHistory(adminSupabase, 'stu-1', 'academy-1', 'boxe')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.student.sport).toBe('boxe')
        expect(result.student.belt).toBe('')
        expect(result.history).toEqual([])
      }
      expect(repo.listBeltHistory).not.toHaveBeenCalled()
    })

    it('retorna student_not_found quando aluno não existe', async () => {
      repo.findStudentHistoryProfile.mockResolvedValue({ data: null, error: null } as never)

      const result = await getGraduationHistory(adminSupabase, 'stu-1', 'academy-1', 'jiu-jitsu')

      expect(result).toEqual({ ok: false, error: 'student_not_found' })
    })

    it('conta treinos só do esporte do período (igual v_trainings_since_belt)', async () => {
      repo.findStudentHistoryProfile.mockResolvedValue({
        data: {
          id: 'stu-1',
          full_name: 'Ana',
          belt: 'azul',
          degree: 0,
          photo_url: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      } as never)
      repo.findStudentSportMaybe.mockResolvedValue({
        data: { sport: 'jiu-jitsu', belt: 'azul', degree: 0 },
        error: null,
      } as never)
      repo.listBeltHistory.mockResolvedValue({
        data: [
          {
            id: 'bh-1',
            belt: 'branca',
            degree: 0,
            graded_at: '2026-02-01T12:00:00.000Z',
            notes: 'Graduação de cadastro inicial',
            trainings_at_graduation: 0,
            sport: 'jiu-jitsu',
            graders: { full_name: 'Admin' },
          },
          {
            id: 'bh-2',
            belt: 'azul',
            degree: 0,
            graded_at: '2026-03-01T12:00:00.000Z',
            notes: null,
            trainings_at_graduation: 1,
            sport: 'jiu-jitsu',
            graders: { full_name: 'Admin' },
          },
        ],
        error: null,
      } as never)
      repo.listAttendanceWithSport.mockResolvedValue({
        data: [
          {
            present_at: '2026-02-15T10:00:00.000Z',
            checkins: { classes: { sport: 'jiu-jitsu' } },
          },
          {
            present_at: '2026-02-20T10:00:00.000Z',
            checkins: { classes: { sport: 'muay-thai' } },
          },
          {
            present_at: '2026-02-25T10:00:00.000Z',
            checkins: { classes: { sport: 'muay-thai' } },
          },
        ],
        error: null,
      } as never)

      const result = await getGraduationHistory(adminSupabase, 'stu-1', 'academy-1', 'jiu-jitsu')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.history[0].trainings_in_period).toBe(1)
        expect(result.history[1].trainings_in_period).toBe(0)
      }
    })
  })
})
