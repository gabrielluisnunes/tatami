import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * @deprecated Este endpoint foi descontinuado por motivos de segurança (LGPD Art. 11).
 * Não exponha dados biométricos (face_descriptor) no cliente.
 * Utilize POST /api/checkin/match para comparação server-side e GET /api/students/list para busca de alunos.
 */
export async function GET() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id || !['professor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const adminSupabase = createStorageAdminClient()

  // Busca todos os alunos da academia que têm face_descriptor cadastrado
  const { data: rawStudents, error } = await adminSupabase
    .from('profiles')
    .select('id, full_name, photo_url, face_descriptor')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .not('face_descriptor', 'is', null)

  if (error) return NextResponse.json({ error: 'Erro ao buscar descritores' }, { status: 500 })

  // Resolve as URLs assinadas das fotos para exibição no avatar do professor
  const students = rawStudents
    ? await Promise.all(
        rawStudents.map(async (student) => {
          if (student.photo_url && !student.photo_url.startsWith('http') && !student.photo_url.startsWith('data:')) {
            const { data } = await adminSupabase.storage
              .from('student-photos')
              .createSignedUrl(student.photo_url, 3600)
            return {
              ...student,
              photo_url: data?.signedUrl || null,
            }
          }
          return student
        })
      )
    : []

  return NextResponse.json({ students })
}
