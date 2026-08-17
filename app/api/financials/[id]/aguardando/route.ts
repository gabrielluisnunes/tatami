import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { markAsAwaitingConfirmation } from '@/lib/services/financials.service'

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

  const result = await markAsAwaitingConfirmation(supabase, params.id, user.id)

  if (!result.ok) {
    if (result.error === 'not_found') {
      return NextResponse.json({ error: 'Cobrança não encontrada' }, { status: 404 })
    }
    if (result.error === 'invalid_status') {
      return NextResponse.json({
        error: 'Cobrança não pode ser marcada como aguardando'
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
