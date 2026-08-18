import type { SupabaseClient } from '@supabase/supabase-js'
import {
  sportsForProfessor,
  type Sport,
  type StudentSportRow,
} from '@/lib/professor-sports'

export interface ProfessorAluno {
  id: string
  full_name: string
  phone: string | null
  photo_url: string | null
  sports: StudentSportRow[]
}

export interface ProfessorGraduacaoRow {
  id: string
  full_name: string
  belt: string
  degree: number
  sport: string
  trainings_since_belt: number
  attendance_rate: number | null
  total_classes_since_belt: number
}

interface ViewRecord {
  student_id: string
  full_name: string
  belt: string | null
  degree: number | null
  trainings_since_belt: number | null
  attendance_rate: number | null
  total_classes_since_belt: number | null
  sport: string | null
}

async function signPhotoUrl(
  adminSupabase: SupabaseClient,
  photoUrl: string | null,
): Promise<string | null> {
  if (!photoUrl || photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
    return photoUrl
  }
  try {
    const { data } = await adminSupabase.storage
      .from('student-photos')
      .createSignedUrl(photoUrl, 3600)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

/** Alunos com esporte(s) que o professor ensina — mesma base para contagem e lista. */
export async function loadProfessorAlunos(
  adminSupabase: SupabaseClient,
  academyId: string,
  teachingSports: Sport[],
): Promise<ProfessorAluno[]> {
  if (teachingSports.length === 0) return []

  const { data: allStudentSports } = await adminSupabase
    .from('student_sports')
    .select('student_id, sport, belt, degree')
    .eq('academy_id', academyId)
    .in('sport', teachingSports)

  const studentSportsMap = new Map<string, StudentSportRow[]>()
  const studentIds = new Set<string>()

  for (const ss of allStudentSports ?? []) {
    studentIds.add(ss.student_id)
    const existing = studentSportsMap.get(ss.student_id) ?? []
    studentSportsMap.set(ss.student_id, [...existing, {
      sport: ss.sport,
      belt: ss.belt,
      degree: ss.degree ?? 0,
    }])
  }

  // Legado: aluno só em profiles (sem linha em student_sports)
  const { data: legacyProfiles } = await adminSupabase
    .from('profiles')
    .select('id')
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .in('sport', teachingSports)

  for (const p of legacyProfiles ?? []) {
    if (!studentSportsMap.has(p.id)) {
      studentIds.add(p.id)
    }
  }

  if (studentIds.size === 0) return []

  const { data: rawAlunos } = await adminSupabase
    .from('profiles')
    .select('id, full_name, belt, degree, phone, photo_url, sport')
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .in('id', [...studentIds])
    .order('full_name', { ascending: true })

  const alunos: ProfessorAluno[] = []

  for (const aluno of rawAlunos ?? []) {
    const sports = sportsForProfessor(
      aluno.id,
      teachingSports,
      studentSportsMap,
      { sport: aluno.sport, belt: aluno.belt, degree: aluno.degree },
    )
    if (sports.length === 0) continue

    alunos.push({
      id: aluno.id,
      full_name: aluno.full_name,
      phone: aluno.phone,
      photo_url: await signPhotoUrl(adminSupabase, aluno.photo_url),
      sports,
    })
  }

  return alunos
}

/** Graduações filtradas por esporte do professor — contagem = linhas da tabela. */
export async function loadProfessorGraduacoes(
  adminSupabase: SupabaseClient,
  academyId: string,
  teachingSports: Sport[],
): Promise<ProfessorGraduacaoRow[]> {
  if (teachingSports.length === 0) return []

  const { data: raw } = await adminSupabase
    .from('v_trainings_since_belt')
    .select('student_id, full_name, belt, degree, trainings_since_belt, attendance_rate, total_classes_since_belt, sport')
    .eq('academy_id', academyId)
    .in('sport', teachingSports)
    .order('full_name', { ascending: true })

  const rows = new Map<string, ProfessorGraduacaoRow>()

  for (const s of (raw as unknown as ViewRecord[]) ?? []) {
    const sport = s.sport ?? 'jiu-jitsu'
    if (!teachingSports.includes(sport as Sport)) continue

    rows.set(`${s.student_id}:${sport}`, {
      id: s.student_id,
      full_name: s.full_name,
      belt: s.belt || (sport === 'jiu-jitsu' ? 'branca' : sport === 'muay-thai' ? 'branco' : ''),
      degree: s.degree ?? 0,
      sport,
      trainings_since_belt: s.trainings_since_belt ?? 0,
      attendance_rate: s.attendance_rate ?? null,
      total_classes_since_belt: s.total_classes_since_belt ?? 0,
    })
  }

  // Legado: aluno em profiles sem linha na view
  const { data: legacyAlunos } = await adminSupabase
    .from('profiles')
    .select('id, full_name, sport, belt, degree')
    .eq('academy_id', academyId)
    .eq('role', 'aluno')
    .in('sport', teachingSports)

  for (const aluno of legacyAlunos ?? []) {
    const sport = (['jiu-jitsu', 'muay-thai', 'boxe'].includes(aluno.sport ?? '')
      ? aluno.sport
      : 'jiu-jitsu') as string
    if (!teachingSports.includes(sport as Sport)) continue

    const key = `${aluno.id}:${sport}`
    if (rows.has(key)) continue

    rows.set(key, {
      id: aluno.id,
      full_name: aluno.full_name,
      belt: aluno.belt ?? (sport === 'jiu-jitsu' ? 'branca' : sport === 'muay-thai' ? 'branco' : ''),
      degree: aluno.degree ?? 0,
      sport,
      trainings_since_belt: 0,
      attendance_rate: null,
      total_classes_since_belt: 0,
    })
  }

  return [...rows.values()].sort((a, b) =>
    a.full_name.localeCompare(b.full_name, 'pt-BR'),
  )
}
