import { createAdminClient, createClient, createStorageAdminClient } from '@/lib/supabase/server'
import type { Sport } from '@/lib/professor-sports'
import * as graduationsRepo from '@/lib/repositories/graduations.repository'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>
type AdminSupabaseClient = ReturnType<typeof createStorageAdminClient>

export type GraduationServiceError =
  | 'boxe_no_graduation'
  | 'student_not_found'
  | 'sport_not_found'
  | 'degree_not_advancing'
  | 'history_insert_failed'
  | 'sport_update_failed'
  | 'profile_update_failed'
  | 'history_load_failed'

export type RegisterGraduationInput = {
  studentId: string
  academyId: string
  gradedBy: string
  belt: string
  degree: number
  sport: Sport
  notes?: string
  trainingsAtGraduation?: number
}

export type GraduationHistoryItem = {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  graded_by_name: string | null
  trainings_in_period: number
  sport: string
}

export type GraduationStudentPayload = {
  id: string
  full_name: string
  belt: string
  degree: number
  sport: string
  photo_url: string | null
  created_at: string
}

type RawGraduationHistoryItem = {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  sport: string | null
  graders: { full_name: string } | null
}

async function signPhotoUrl(
  adminSupabase: AdminSupabaseClient,
  photoUrl: string | null,
): Promise<string | null> {
  if (!photoUrl || photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
    return photoUrl
  }

  const { data } = await graduationsRepo.createSignedPhotoUrl(adminSupabase, photoUrl)
  return data?.signedUrl ?? null
}

export async function registerGraduation(
  supabase: SupabaseClient,
  adminSupabase: AdminSupabaseClient,
  input: RegisterGraduationInput,
): Promise<
  | { ok: true }
  | { ok: false; error: GraduationServiceError; message?: string }
> {
  if (input.sport === 'boxe') {
    return { ok: false, error: 'boxe_no_graduation', message: 'Boxe não possui graduação' }
  }

  const { data: student } = await graduationsRepo.findStudentSportProfile(
    supabase,
    input.studentId,
    input.academyId,
  )

  if (!student) {
    return { ok: false, error: 'student_not_found' }
  }

  const { data: studentSport } = await graduationsRepo.findStudentSport(
    adminSupabase,
    input.studentId,
    input.academyId,
    input.sport,
  )

  if (!studentSport) {
    return { ok: false, error: 'sport_not_found' }
  }

  const currentBelt = studentSport.belt
  const currentDegree = studentSport.degree ?? 0
  const nextDegree = input.sport === 'jiu-jitsu' ? input.degree : 0

  if (input.belt === currentBelt && nextDegree <= currentDegree) {
    return {
      ok: false,
      error: 'degree_not_advancing',
      message: `Para promoção de grau na mesma faixa, o novo grau deve ser maior que o atual (${currentDegree}º grau)`,
    }
  }

  const now = new Date().toISOString()

  const { error: historyError } = await graduationsRepo.insertBeltHistory(adminSupabase, {
    student_id: input.studentId,
    academy_id: input.academyId,
    belt: input.belt,
    degree: nextDegree,
    sport: input.sport,
    graded_at: now,
    graded_by: input.gradedBy,
    notes: input.notes ?? null,
    trainings_at_graduation: input.trainingsAtGraduation ?? null,
  })

  if (historyError) {
    console.error('[GRADUATIONS] insert belt_history error:', historyError)
    return { ok: false, error: 'history_insert_failed' }
  }

  const { error: sportError } = await graduationsRepo.updateStudentSportBelt(
    adminSupabase,
    input.studentId,
    input.sport,
    input.belt,
    nextDegree,
    now,
  )

  if (sportError) {
    return { ok: false, error: 'sport_update_failed' }
  }

  if (student.sport === input.sport) {
    const { error: profileError } = await graduationsRepo.updateProfileBelt(
      supabase,
      input.studentId,
      input.belt,
      nextDegree,
      now,
    )

    if (profileError) {
      return { ok: false, error: 'profile_update_failed' }
    }
  }

  return { ok: true }
}

export async function getGraduationHistory(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  academyId: string,
  sportFilter: string | null,
): Promise<
  | { ok: true; student: GraduationStudentPayload; history: GraduationHistoryItem[] }
  | { ok: false; error: GraduationServiceError }
> {
  const { data: student } = await graduationsRepo.findStudentHistoryProfile(
    adminSupabase,
    studentId,
    academyId,
  )

  if (!student) {
    return { ok: false, error: 'student_not_found' }
  }

  let sportBelt = student.belt ?? 'branca'
  let sportDegree = student.degree ?? 0
  let sportValue = sportFilter ?? 'jiu-jitsu'

  if (sportFilter) {
    const { data: studentSport } = await graduationsRepo.findStudentSportMaybe(
      adminSupabase,
      studentId,
      academyId,
      sportFilter,
    )

    if (studentSport) {
      sportValue = studentSport.sport
      sportBelt = studentSport.sport === 'boxe'
        ? ''
        : (studentSport.belt ?? (studentSport.sport === 'muay-thai' ? 'branco' : 'branca'))
      sportDegree = studentSport.sport === 'jiu-jitsu' ? (studentSport.degree ?? 0) : 0
    }
  }

  const photoUrl = await signPhotoUrl(adminSupabase, student.photo_url ?? null)

  if (sportFilter === 'boxe') {
    return {
      ok: true,
      student: {
        id: student.id,
        full_name: student.full_name,
        belt: '',
        degree: 0,
        sport: 'boxe',
        photo_url: photoUrl,
        created_at: student.created_at,
      },
      history: [],
    }
  }

  const { data: rawHistory, error: historyError } = await graduationsRepo.listBeltHistory(
    adminSupabase,
    studentId,
    academyId,
  )

  if (historyError) {
    console.error('[GRADUATIONS] belt_history error:', historyError)
    return { ok: false, error: 'history_load_failed' }
  }

  const rawHistoryArray = ((rawHistory as unknown as RawGraduationHistoryItem[]) ?? [])
    .filter((item) => {
      if (!sportFilter) return true
      const itemSport = item.sport ?? 'jiu-jitsu'
      return itemSport === sportFilter
    })

  const { data: attendanceData } = await graduationsRepo.listAttendanceWithSport(
    adminSupabase,
    studentId,
    academyId,
  )

  type AttendanceRow = {
    present_at: string
    checkins: { classes: { sport: string } }
  }

  const attendanceRows = ((attendanceData as unknown as AttendanceRow[]) ?? []).map((row) => ({
    timestamp: new Date(row.present_at).getTime(),
    sport: row.checkins.classes.sport,
  }))

  const lastIdx = rawHistoryArray.length - 1

  const history = rawHistoryArray.map((item, idx) => {
    const periodStart = new Date(item.graded_at).getTime()
    const periodEnd = idx === lastIdx
      ? Date.now()
      : new Date(rawHistoryArray[idx + 1].graded_at).getTime()
    const itemSport = item.sport ?? 'jiu-jitsu'

    return {
      id: item.id,
      belt: item.belt ?? 'branca',
      degree: item.degree ?? 0,
      graded_at: item.graded_at,
      notes: item.notes,
      trainings_at_graduation: item.trainings_at_graduation,
      graded_by_name: item.graders?.full_name ?? null,
      // Mesma regra da view v_trainings_since_belt: treino do esporte, após graded_at, antes da próxima faixa
      trainings_in_period: attendanceRows.filter(
        (a) => a.sport === itemSport && a.timestamp > periodStart && a.timestamp < periodEnd,
      ).length,
      sport: itemSport,
    }
  })

  return {
    ok: true,
    student: {
      id: student.id,
      full_name: student.full_name,
      belt: sportBelt,
      degree: sportDegree,
      sport: sportValue,
      photo_url: photoUrl,
      created_at: student.created_at,
    },
    history,
  }
}
