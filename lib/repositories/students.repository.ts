import { createAdminClient, createClient, createStorageAdminClient } from '@/lib/supabase/server'
import type { Sport } from '@/lib/professor-sports'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>
type AdminSupabaseClient = ReturnType<typeof createStorageAdminClient>

export type SportRow = {
  sport: Sport
  belt?: string | null
  degree?: number
}

export async function findAcademyById(supabase: SupabaseClient, academyId: string) {
  return supabase
    .from('academies')
    .select('name, plan')
    .eq('id', academyId)
    .single()
}

export async function countStudentsInAcademy(supabase: SupabaseClient, academyId: string) {
  return supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
}

export async function findMemberInAcademy(
  supabase: SupabaseClient,
  memberId: string,
  academyId: string,
) {
  return supabase
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('academy_id', academyId)
    .in('role', ['aluno', 'professor', 'admin'])
    .single()
}

export async function createAuthUser(
  adminSupabase: AdminSupabaseClient,
  input: {
    email: string
    password: string
    full_name: string
    role: string
    academy_id: string
    belt: string | null
  },
) {
  return adminSupabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
      academy_id: input.academy_id,
      belt: input.belt,
    },
  })
}

export async function deleteAuthUser(adminSupabase: AdminSupabaseClient, userId: string) {
  return adminSupabase.auth.admin.deleteUser(userId)
}

export async function updateProfile(
  supabase: SupabaseClient | AdminSupabaseClient,
  userId: string,
  updates: Record<string, unknown>,
) {
  return supabase.from('profiles').update(updates).eq('id', userId)
}

export async function deleteProfile(
  adminSupabase: AdminSupabaseClient,
  userId: string,
  academyId: string,
) {
  return adminSupabase
    .from('profiles')
    .delete()
    .eq('id', userId)
    .eq('academy_id', academyId)
}

export async function listStudentsByAcademy(supabase: SupabaseClient, academyId: string) {
  return supabase
    .from('profiles')
    .select('id, full_name, photo_url')
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })
}

export async function listStudentIdsBySport(
  adminSupabase: AdminSupabaseClient,
  academyId: string,
  sport: string,
) {
  return adminSupabase
    .from('student_sports')
    .select('student_id')
    .eq('academy_id', academyId)
    .eq('sport', sport)
}

export async function listStudentSports(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
) {
  return adminSupabase
    .from('student_sports')
    .select('id, sport')
    .eq('student_id', studentId)
}

export async function insertStudentSport(
  adminSupabase: AdminSupabaseClient,
  row: {
    student_id: string
    academy_id: string
    sport: Sport
    belt: string | null
    degree: number
  },
) {
  return adminSupabase.from('student_sports').insert(row)
}

export async function updateStudentSport(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  sport: Sport,
  belt: string | null,
  degree: number,
) {
  return adminSupabase
    .from('student_sports')
    .update({ belt, degree })
    .eq('student_id', studentId)
    .eq('sport', sport)
}

export async function deleteStudentSports(
  adminSupabase: AdminSupabaseClient,
  studentId: string,
  sports: string[],
) {
  return adminSupabase
    .from('student_sports')
    .delete()
    .eq('student_id', studentId)
    .in('sport', sports)
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
    notes: string
    trainings_at_graduation: number
  },
) {
  return adminSupabase.from('belt_history').insert(row)
}
