import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id || !['professor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const adminSupabase = createStorageAdminClient()

  // Verifica que o checkin pertence ao professor/academia
  const { data: checkin } = await adminSupabase
    .from('checkins')
    .select('id, professor_id, academy_id')
    .eq('id', params.id)
    .single()

  if (!checkin || checkin.academy_id !== profile.academy_id) {
    return NextResponse.json({ error: 'Check-in não encontrado' }, { status: 404 })
  }

  // Busca registros de attendance com dados do aluno
  const { data: rows, error } = await adminSupabase
    .from('attendance')
    .select('student_id, source, similarity, profiles ( full_name, photo_url )')
    .eq('checkin_id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao buscar presenças' }, { status: 500 })

  // Resolve URLs assinadas das fotos
  const students = await Promise.all(
    (rows ?? []).map(async (row) => {
      const profile = row.profiles as unknown as { full_name: string; photo_url: string | null } | null
      let photo_url = profile?.photo_url ?? null

      if (photo_url && !photo_url.startsWith('http') && !photo_url.startsWith('data:')) {
        const { data } = await adminSupabase.storage
          .from('student-photos')
          .createSignedUrl(photo_url, 3600)
        photo_url = data?.signedUrl ?? null
      }

      return {
        student_id: row.student_id as string,
        full_name: profile?.full_name ?? 'Aluno',
        photo_url,
        source: row.source as 'ai' | 'manual',
        similarity: row.similarity as number | undefined,
      }
    })
  )

  return NextResponse.json({ students })
}
