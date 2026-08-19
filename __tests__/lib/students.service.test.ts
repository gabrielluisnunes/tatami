import {
  deleteMember,
  enrollMember,
  listStudentsForCheckin,
  updateMember,
} from '@/lib/services/students.service'
import * as studentsRepo from '@/lib/repositories/students.repository'

jest.mock('@/lib/repositories/students.repository')

const repo = studentsRepo as jest.Mocked<typeof studentsRepo>

const supabase = {
  storage: {
    from: jest.fn().mockReturnValue({
      createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://signed/photo' } }),
    }),
  },
} as never

const adminSupabase = {} as never

describe('students.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('enrollMember', () => {
    const baseInput = {
      academyId: 'academy-1',
      enrolledBy: 'admin-1',
      full_name: 'Aluno Teste',
      email: 'aluno@teste.com',
      role: 'aluno' as const,
      sports: [{ sport: 'jiu-jitsu' as const, belt: 'branca', degree: 0 }],
      password: 'temp123456',
    }

    it('rejeita aluno sem esportes', async () => {
      const result = await enrollMember(supabase, adminSupabase, {
        ...baseInput,
        sports: [],
      })

      expect(result).toEqual({
        ok: false,
        error: 'invalid_sports',
        message: 'Selecione pelo menos um esporte',
      })
      expect(repo.createAuthUser).not.toHaveBeenCalled()
    })

    it('rejeita professor sem esportes', async () => {
      const result = await enrollMember(supabase, adminSupabase, {
        ...baseInput,
        role: 'professor',
        sports: [],
      })

      expect(result).toEqual({
        ok: false,
        error: 'invalid_sports',
        message: 'Selecione pelo menos um esporte que o professor ensina',
      })
    })

    it('bloqueia cadastro no limite do plano Starter', async () => {
      repo.findAcademyById.mockResolvedValue({
        data: { name: 'Dojo', plan: 'starter' },
        error: null,
      } as never)
      repo.countStudentsInAcademy.mockResolvedValue({ count: 50, error: null } as never)

      const result = await enrollMember(supabase, adminSupabase, baseInput)

      expect(result).toEqual({ ok: false, error: 'plan_limit_reached' })
      expect(repo.createAuthUser).not.toHaveBeenCalled()
    })

    it('cadastra aluno com student_sports e belt_history', async () => {
      repo.findAcademyById.mockResolvedValue({
        data: { name: 'Dojo', plan: 'pro' },
        error: null,
      } as never)
      repo.createAuthUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      } as never)
      repo.updateProfile.mockResolvedValue({ error: null } as never)
      repo.insertStudentSport.mockResolvedValue({ error: null } as never)
      repo.insertBeltHistory.mockResolvedValue({ error: null } as never)

      const result = await enrollMember(supabase, adminSupabase, baseInput)

      expect(result).toEqual({ ok: true, userId: 'user-1' })
      expect(repo.insertStudentSport).toHaveBeenCalledWith(
        adminSupabase,
        expect.objectContaining({
          student_id: 'user-1',
          sport: 'jiu-jitsu',
          belt: 'branca',
          degree: 0,
        }),
      )
      expect(repo.insertBeltHistory).toHaveBeenCalledWith(
        adminSupabase,
        expect.objectContaining({
          student_id: 'user-1',
          sport: 'jiu-jitsu',
          notes: 'Graduação de cadastro inicial',
        }),
      )
    })

    it('cadastra professor sem student_sports nem belt_history', async () => {
      repo.findAcademyById.mockResolvedValue({
        data: { name: 'Dojo', plan: 'pro' },
        error: null,
      } as never)
      repo.createAuthUser.mockResolvedValue({
        data: { user: { id: 'prof-1' } },
        error: null,
      } as never)
      repo.updateProfile.mockResolvedValue({ error: null } as never)

      const result = await enrollMember(supabase, adminSupabase, {
        ...baseInput,
        role: 'professor',
        sports: [{ sport: 'jiu-jitsu', belt: 'preta', degree: 1 }],
      })

      expect(result).toEqual({ ok: true, userId: 'prof-1' })
      expect(repo.insertStudentSport).not.toHaveBeenCalled()
      expect(repo.insertBeltHistory).not.toHaveBeenCalled()
    })

    it('não insere belt_history para boxe', async () => {
      repo.findAcademyById.mockResolvedValue({
        data: { name: 'Dojo', plan: 'pro' },
        error: null,
      } as never)
      repo.createAuthUser.mockResolvedValue({
        data: { user: { id: 'user-2' } },
        error: null,
      } as never)
      repo.updateProfile.mockResolvedValue({ error: null } as never)
      repo.insertStudentSport.mockResolvedValue({ error: null } as never)

      await enrollMember(supabase, adminSupabase, {
        ...baseInput,
        sports: [{ sport: 'boxe' }],
      })

      expect(repo.insertStudentSport).toHaveBeenCalledWith(
        adminSupabase,
        expect.objectContaining({ sport: 'boxe', belt: null, degree: 0 }),
      )
      expect(repo.insertBeltHistory).not.toHaveBeenCalled()
    })
  })

  describe('updateMember', () => {
    it('retorna not_found quando membro não existe', async () => {
      repo.findMemberInAcademy.mockResolvedValue({ data: null, error: null } as never)

      const result = await updateMember(supabase, adminSupabase, 'stu-1', 'academy-1', {
        full_name: 'Novo Nome',
      })

      expect(result).toEqual({ ok: false, error: 'not_found' })
    })

    it('atualiza perfil e sincroniza esportes', async () => {
      repo.findMemberInAcademy.mockResolvedValue({ data: { id: 'stu-1' }, error: null } as never)
      repo.updateProfile.mockResolvedValue({ error: null } as never)
      repo.listStudentSports.mockResolvedValue({
        data: [{ id: 'ss-1', sport: 'jiu-jitsu' }],
        error: null,
      } as never)
      repo.updateStudentSport.mockResolvedValue({ error: null } as never)

      const result = await updateMember(supabase, adminSupabase, 'stu-1', 'academy-1', {
        full_name: 'Novo Nome',
        sports: [{ sport: 'jiu-jitsu', belt: 'azul', degree: 1 }],
      })

      expect(result).toEqual({ ok: true })
      expect(repo.updateProfile).toHaveBeenCalled()
      expect(repo.updateStudentSport).toHaveBeenCalledWith(
        adminSupabase,
        'stu-1',
        'jiu-jitsu',
        'azul',
        1,
      )
    })
  })

  describe('deleteMember', () => {
    it('impede excluir a própria conta', async () => {
      const result = await deleteMember(
        supabase,
        adminSupabase,
        'admin-1',
        'academy-1',
        'admin-1',
      )

      expect(result).toEqual({ ok: false, error: 'cannot_delete_self' })
      expect(repo.deleteProfile).not.toHaveBeenCalled()
    })

    it('exclui membro da academia', async () => {
      repo.findMemberInAcademy.mockResolvedValue({ data: { id: 'stu-1' }, error: null } as never)
      repo.deleteProfile.mockResolvedValue({ error: null } as never)
      repo.deleteAuthUser.mockResolvedValue({ error: null } as never)

      const result = await deleteMember(
        supabase,
        adminSupabase,
        'stu-1',
        'academy-1',
        'admin-1',
      )

      expect(result).toEqual({ ok: true })
      expect(repo.deleteProfile).toHaveBeenCalledWith(adminSupabase, 'stu-1', 'academy-1')
      expect(repo.deleteAuthUser).toHaveBeenCalledWith(adminSupabase, 'stu-1')
    })
  })

  describe('listStudentsForCheckin', () => {
    it('marca elegibilidade por esporte', async () => {
      repo.listStudentsByAcademy.mockResolvedValue({
        data: [
          { id: 'stu-1', full_name: 'Ana', photo_url: 'path/ana.jpg' },
          { id: 'stu-2', full_name: 'Bob', photo_url: null },
        ],
        error: null,
      } as never)
      repo.listStudentIdsBySport.mockResolvedValue({
        data: [{ student_id: 'stu-1' }],
        error: null,
      } as never)

      const result = await listStudentsForCheckin(
        supabase,
        adminSupabase,
        'academy-1',
        'jiu-jitsu',
      )

      expect(result.students).toEqual([
        {
          id: 'stu-1',
          full_name: 'Ana',
          photo_url: 'https://signed/photo',
          eligible: true,
        },
        {
          id: 'stu-2',
          full_name: 'Bob',
          photo_url: null,
          eligible: false,
        },
      ])
      expect(result.sport).toBe('jiu-jitsu')
    })

    it('sem filtro de esporte todos são elegíveis', async () => {
      repo.listStudentsByAcademy.mockResolvedValue({
        data: [{ id: 'stu-1', full_name: 'Ana', photo_url: null }],
        error: null,
      } as never)

      const result = await listStudentsForCheckin(supabase, adminSupabase, 'academy-1', null)

      expect(result.students[0].eligible).toBe(true)
      expect(result.sport).toBeNull()
      expect(repo.listStudentIdsBySport).not.toHaveBeenCalled()
    })
  })
})
