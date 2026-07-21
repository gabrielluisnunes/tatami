import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const MATCH_THRESHOLD = 0.6

const matchSchema = z.object({
  detected_descriptors: z.array(z.array(z.number()).length(128)).min(1).max(50),
  academy_id: z.string().uuid().optional(),
})

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

export async function POST(request: Request) {
  const supabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id || !['professor', 'admin'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof matchSchema>
  try {
    body = matchSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Buscar todos os descritores dos alunos da academia (APENAS no servidor)
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, photo_url, face_descriptor')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .not('face_descriptor', 'is', null)

  if (!students || students.length === 0) {
    return NextResponse.json({ matches: [] })
  }

  // Gerar signed URLs das fotos (sem expor face_descriptor)
  const studentsWithPhotos = await Promise.all(
    students.map(async (s) => {
      let photoUrl = s.photo_url ?? null
      if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
        const { data } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(photoUrl, 3600)
        photoUrl = data?.signedUrl ?? null
      }
      return { 
        id: s.id, 
        full_name: s.full_name, 
        photo_url: photoUrl,
        face_descriptor: s.face_descriptor as number[]
      }
    })
  )

  // Comparar cada face detectada com todos os alunos (servidor)
  const matches: Array<{
    student_id: string
    full_name: string
    photo_url: string | null
    similarity: number
    source: 'ai'
  }> = []

  const matchedStudentIds = new Set<string>()

  for (const detectedDescriptor of body.detected_descriptors) {
    let bestMatch: typeof studentsWithPhotos[0] | null = null
    let bestDistance = MATCH_THRESHOLD

    for (const student of studentsWithPhotos) {
      if (matchedStudentIds.has(student.id)) continue
      if (!student.face_descriptor) continue

      const distance = euclideanDistance(detectedDescriptor, student.face_descriptor)
      if (distance < bestDistance) {
        bestDistance = distance
        bestMatch = student
      }
    }

    if (bestMatch) {
      matchedStudentIds.add(bestMatch.id)
      matches.push({
        student_id: bestMatch.id,
        full_name: bestMatch.full_name,
        photo_url: bestMatch.photo_url,
        similarity: bestDistance,
        source: 'ai',
      })
    }
  }

  // Retorna apenas os matches — NUNCA retorna face_descriptor
  return NextResponse.json({ matches })
}
