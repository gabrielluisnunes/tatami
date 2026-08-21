import { createAdminClient, createClient, createStorageAdminClient } from '@/lib/supabase/server'
import type { Sport } from '@/lib/professor-sports'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>
type AdminSupabaseClient = ReturnType<typeof createStorageAdminClient>

export async function findStudentSportProfile(
  supabase: SupabaseClient | AdminSupabaseClient,
  studentId: string,
  academyId: string,
) {
  return supabase
    .from('profiles')
    .select('id, sport')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .single()
}

export async function findStudentHistoryProfile(
  supabase: SupabaseClient | AdminSupabaseClient,
  studentId: string,
  academyId: string,
) {
  return supabase
    .from('profiles')
    .select('id, full_name, belt, degree, photo_url, created_at')
    .eq('id', studentId)
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .single()
}

export async function findStudentSport(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  academyId: string,
  sport: string,
) {
  return adminSupabase
    .from('student_sports')
    .select('sport, belt, degree')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .eq('sport', sport)
    .single()
}

export async function findStudentSportMaybe(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  academyId: string,
  sport: string,
) {
  return adminSupabase
    .from('student_sports')
    .select('sport, belt, degree')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .eq('sport', sport)
    .maybeSingle()
}

export async function insertBeltHistory(
  adminSupabase: AdminSupabaseClient,
  row: {
    student_id: string
    academy_id: string
    belt: string
    degree: number
    sport: Sport
    graded_at: string
    graded_by: string
    notes: string | null
    trainings_at_graduation: number | null
  },
) {
  return adminSupabase.from('belt_history').insert(row)
}

export async function updateStudentSportBelt(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  sport: Sport,
  belt: string,
  degree: number,
  beltUpdatedAt: string,
) {
  return adminSupabase
    .from('student_sports')
    .update({
      belt,
      degree,
      belt_updated_at: beltUpdatedAt,
    })
    .eq('student_id', studentId)
    .eq('sport', sport)
}

export async function updateProfileBelt(
  supabase: SupabaseClient,
  studentId: string,
  belt: string,
  degree: number,
  beltUpdatedAt: string,
) {
  return supabase
    .from('profiles')
    .update({
      belt,
      degree,
      belt_updated_at: beltUpdatedAt,
    })
    .eq('id', studentId)
}

export async function listBeltHistory(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  academyId: string,
) {
  return adminSupabase
    .from('belt_history')
    .select(`
      id,
      belt,
      degree,
      graded_at,
      notes,
      trainings_at_graduation,
      sport,
      graders:profiles!belt_history_graded_by_fkey ( full_name )
    `)
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .order('graded_at', { ascending: true })
}

export async function listAttendanceWithSport(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  academyId: string,
) {
  return adminSupabase
    .from('attendance')
    .select(`
      present_at,
      checkins!inner (
        classes!inner ( sport )
      )
    `)
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .order('present_at', { ascending: true })
}

export async function createSignedPhotoUrl(
  adminSupabase: AdminSupabaseClient,
  photoPath: string,
) {
  return adminSupabase.storage.from('student-photos').createSignedUrl(photoPath, 3600)
}
