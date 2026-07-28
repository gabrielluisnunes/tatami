import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  _request: Request,
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

  if (!profile?.academy_id || profile.role !== 'aluno') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verificar que a cobrança pertence ao aluno
  const { data: financial } = await supabase
    .from('financials')
    .select('id, status, student_id')
    .eq('id', params.id)
    .eq('student_id', user.id)
    .single()

  if (!financial) {
    return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
  }

  if (!['pending', 'overdue'].includes(financial.status)) {
    return NextResponse.json({ 
      error: 'Cobrança não pode ser marcada como aguardando' 
    }, { status: 400 })
  }

  const { error } = await supabase
    .from('financials')
    .update({ status: 'aguardando_confirmacao' })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
