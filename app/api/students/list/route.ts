import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
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

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, photo_url')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  // Gerar signed URLs
  const studentsWithPhotos = await Promise.all(
    (students ?? []).map(async (s) => {
      let photoUrl = s.photo_url ?? null
      if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
        const { data } = await supabase.storage
          .from('student-photos')
          .createSignedUrl(photoUrl, 3600)
        photoUrl = data?.signedUrl ?? null
      }
      return { id: s.id, full_name: s.full_name, photo_url: photoUrl }
    })
  )

  // NUNCA retorna face_descriptor
  return NextResponse.json({ students: studentsWithPhotos })
}
