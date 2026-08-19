import { createAdminClient, createClient, createStorageAdminClient } from '@/lib/supabase/server'
import type { Sport } from '@/lib/professor-sports'
import * as studentsRepo from '@/lib/repositories/students.repository'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>
type AdminSupabaseClient = ReturnType<typeof createStorageAdminClient>

export type StudentServiceError =
  | 'invalid_sports'
  | 'plan_limit_reached'
  | 'count_failed'
  | 'email_already_registered'
  | 'create_user_failed'
  | 'not_found'
  | 'update_failed'
  | 'delete_failed'
  | 'cannot_delete_self'

export type SportItem = {
  sport: Sport
  belt?: string | null
  degree?: number
}

export type EnrollInput = {
  full_name: string
  email: string
  role: 'aluno' | 'professor'
  sports: SportItem[]
  birth_date?: string
  phone?: string
  emergency_phone?: string
  cep?: string
  address?: string
  neighborhood?: string
  city?: string
  state?: string
  password: string
}

export type UpdateMemberInput = {
  full_name?: string
  birth_date?: string | null
  phone?: string | null
  emergency_phone?: string | null
  cep?: string | null
  address?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  sports?: SportItem[]
}

export type ListedStudent = {
  id: string
  full_name: string
  photo_url: string | null
  eligible: boolean
}

function sportBelt(s: SportItem): string | null {
  return s.sport !== 'boxe' ? (s.belt ?? null) : null
}

function sportDegree(s: SportItem): number {
  return s.sport === 'jiu-jitsu' ? (s.degree ?? 0) : 0
}

function defaultBelt(s: SportItem): string {
  return s.belt ?? (s.sport === 'jiu-jitsu' ? 'branca' : 'branco')
}

async function signPhotoUrl(
  supabase: SupabaseClient,
  photoUrl: string | null,
): Promise<string | null> {
  if (!photoUrl || photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
    return photoUrl
  }

  const { data } = await supabase.storage
    .from('student-photos')
    .createSignedUrl(photoUrl, 3600)

  return data?.signedUrl ?? null
}

export async function enrollMember(
  supabase: SupabaseClient,
  adminSupabase: AdminSupabaseClient,
  input: EnrollInput & { academyId: string; enrolledBy: string },
): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: StudentServiceError; message?: string }
> {
  if (input.role === 'aluno' && input.sports.length === 0) {
    return { ok: false, error: 'invalid_sports', message: 'Selecione pelo menos um esporte' }
  }

  if (input.role === 'professor' && input.sports.length === 0) {
    return {
      ok: false,
      error: 'invalid_sports',
      message: 'Selecione pelo menos um esporte que o professor ensina',
    }
  }

  const { data: academy } = await studentsRepo.findAcademyById(supabase, input.academyId)

  if (input.role === 'aluno' && academy?.plan === 'starter') {
    const { count, error: countError } = await studentsRepo.countStudentsInAcademy(
      supabase,
      input.academyId,
    )

    if (countError) {
      return { ok: false, error: 'count_failed' }
    }

    if ((count ?? 0) >= 50) {
      return { ok: false, error: 'plan_limit_reached' }
    }
  }

  const primarySport = input.sports[0]

  const { data: created, error: createError } = await studentsRepo.createAuthUser(
    adminSupabase,
    {
      email: input.email,
      password: input.password,
      full_name: input.full_name,
      role: input.role,
      academy_id: input.academyId,
      belt: primarySport?.belt ?? null,
    },
  )

  if (createError || !created.user) {
    console.error('[ENROLL] createUser error:', JSON.stringify(createError))
    if (createError?.message?.includes('already')) {
      return { ok: false, error: 'email_already_registered' }
    }
    return {
      ok: false,
      error: 'create_user_failed',
      message: createError?.message ?? 'Erro ao criar usuário',
    }
  }

  const updates: Record<string, unknown> = {
    full_name: input.full_name,
    role: input.role,
    academy_id: input.academyId,
  }

  if (primarySport) {
    updates.sport = primarySport.sport
    updates.belt = primarySport.belt ?? null
    updates.degree = sportDegree(primarySport)
  }

  if (input.birth_date) updates.birth_date = input.birth_date
  if (input.phone) updates.phone = input.phone
  if (input.emergency_phone) updates.emergency_phone = input.emergency_phone
  if (input.cep) updates.cep = input.cep
  if (input.address) updates.address = input.address
  if (input.neighborhood) updates.neighborhood = input.neighborhood
  if (input.city) updates.city = input.city
  if (input.state) updates.state = input.state

  if (Object.keys(updates).length > 0) {
    const { error: profileError } = await studentsRepo.updateProfile(
      adminSupabase,
      created.user.id,
      updates,
    )
    if (profileError) {
      console.error('[ENROLL] profiles update error:', JSON.stringify(profileError))
    }
  }

  if (input.role === 'aluno') {
    for (const s of input.sports) {
      const { error: ssError } = await studentsRepo.insertStudentSport(adminSupabase, {
        student_id: created.user.id,
        academy_id: input.academyId,
        sport: s.sport,
        belt: sportBelt(s),
        degree: sportDegree(s),
      })
      if (ssError) console.error('[ENROLL] student_sports error:', JSON.stringify(ssError))

      if (s.sport !== 'boxe') {
        const { error: bhError } = await studentsRepo.insertBeltHistory(adminSupabase, {
          student_id: created.user.id,
          academy_id: input.academyId,
          belt: defaultBelt(s),
          degree: sportDegree(s),
          sport: s.sport,
          graded_at: new Date().toISOString(),
          graded_by: input.enrolledBy,
          notes: 'Graduação de cadastro inicial',
          trainings_at_graduation: 0,
        })
        if (bhError) console.error('[ENROLL] belt_history error:', JSON.stringify(bhError))
      }
    }
  }

  return { ok: true, userId: created.user.id }
}

export async function updateMember(
  supabase: SupabaseClient,
  adminSupabase: AdminSupabaseClient,
  memberId: string,
  academyId: string,
  input: UpdateMemberInput,
): Promise<{ ok: true } | { ok: false; error: StudentServiceError }> {
  const { data: member } = await studentsRepo.findMemberInAcademy(
    supabase,
    memberId,
    academyId,
  )

  if (!member) return { ok: false, error: 'not_found' }

  const { sports, ...profileFields } = input

  const { error } = await studentsRepo.updateProfile(supabase, memberId, profileFields)
  if (error) return { ok: false, error: 'update_failed' }

  if (sports !== undefined && sports.length > 0) {
    const primary = sports[0]
    await studentsRepo.updateProfile(supabase, memberId, {
      sport: primary.sport,
      belt: sportBelt(primary),
      degree: sportDegree(primary),
    })

    const { data: currentSports } = await studentsRepo.listStudentSports(adminSupabase, memberId)
    const currentSportNames = (currentSports ?? []).map((s) => s.sport)
    const newSportNames = sports.map((s) => s.sport)

    const sportsToDelete = currentSportNames.filter((s) => !newSportNames.includes(s))
    if (sportsToDelete.length > 0) {
      await studentsRepo.deleteStudentSports(adminSupabase, memberId, sportsToDelete)
    }

    for (const s of sports) {
      const exists = currentSportNames.includes(s.sport)

      if (exists) {
        const { error: updateError } = await studentsRepo.updateStudentSport(
          adminSupabase,
          memberId,
          s.sport,
          sportBelt(s),
          sportDegree(s),
        )
        if (updateError) console.error('[PATCH] update student_sports error:', updateError)
      } else {
        const { error: insertError } = await studentsRepo.insertStudentSport(adminSupabase, {
          student_id: memberId,
          academy_id: academyId,
          sport: s.sport,
          belt: sportBelt(s),
          degree: sportDegree(s),
        })
        if (insertError) console.error('[PATCH] insert student_sports error:', insertError)
      }
    }
  }

  return { ok: true }
}

export async function deleteMember(
  supabase: SupabaseClient,
  adminSupabase: AdminSupabaseClient,
  memberId: string,
  academyId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: StudentServiceError }> {
  if (actorId === memberId) {
    return { ok: false, error: 'cannot_delete_self' }
  }

  const { data: member } = await studentsRepo.findMemberInAcademy(
    supabase,
    memberId,
    academyId,
  )

  if (!member) return { ok: false, error: 'not_found' }

  const { error: profileError } = await studentsRepo.deleteProfile(
    adminSupabase,
    memberId,
    academyId,
  )

  if (profileError) {
    console.error('[DELETE] profiles delete error:', profileError)
    return { ok: false, error: 'delete_failed' }
  }

  const { error: authError } = await studentsRepo.deleteAuthUser(adminSupabase, memberId)
  if (authError && authError.code !== 'user_not_found' && authError.status !== 404) {
    console.error('[DELETE] auth.admin.deleteUser error:', authError)
    return { ok: false, error: 'delete_failed' }
  }

  return { ok: true }
}

export async function listStudentsForCheckin(
  supabase: SupabaseClient,
  adminSupabase: AdminSupabaseClient,
  academyId: string,
  sport: string | null,
): Promise<{ ok: true; students: ListedStudent[]; sport: string | null }> {
  const { data: students } = await studentsRepo.listStudentsByAcademy(supabase, academyId)

  const eligibleIds = new Set<string>()
  if (sport) {
    const { data: sportsRows } = await studentsRepo.listStudentIdsBySport(
      adminSupabase,
      academyId,
      sport,
    )

    for (const row of sportsRows ?? []) {
      eligibleIds.add(row.student_id)
    }
  }

  const studentsWithPhotos = await Promise.all(
    (students ?? []).map(async (s) => ({
      id: s.id,
      full_name: s.full_name,
      photo_url: await signPhotoUrl(supabase, s.photo_url ?? null),
      eligible: sport ? eligibleIds.has(s.id) : true,
    })),
  )

  return { ok: true, students: studentsWithPhotos, sport }
}
