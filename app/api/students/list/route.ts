import { createAdminClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { listStudentsForCheckin } from '@/lib/services/students.service'

export async function GET(request: Request) {
  const supabase = createAdminClient()
  const adminSupabase = createStorageAdminClient()

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

  const sport = new URL(request.url).searchParams.get('sport')

  const result = await listStudentsForCheckin(
    supabase,
    adminSupabase,
    profile.academy_id,
    sport,
  )

  // NUNCA retorna face_descriptor
  return NextResponse.json({ students: result.students, sport: result.sport })
}
