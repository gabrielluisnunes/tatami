import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; studentId: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verificar que o check-in pertence à academia do admin
  const { data: checkin } = await supabase
    .from('checkins')
    .select('id, academy_id')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!checkin) {
    return NextResponse.json({ error: 'Check-in não encontrado' }, { status: 404 })
  }

  // Deletar apenas o attendance do aluno específico nesse check-in
  const { error } = await supabase
    .from('attendance')
    .delete()
    .eq('checkin_id', params.id)
    .eq('student_id', params.studentId)

  if (error) {
    console.error('Erro ao remover aluno do check-in:', error)
    return NextResponse.json({ error: 'Erro ao remover aluno' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
