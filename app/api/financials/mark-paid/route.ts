import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { markAsPaid } from '@/lib/services/financials.service'

const schema = z.object({
  financial_id: z.string().uuid(),
})

export async function POST(request: Request) {
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

  let body: z.infer<typeof schema>
  try {
    body = schema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const result = await markAsPaid(supabase, body.financial_id, profile.academy_id)

  if (!result.ok) {
    if (result.error === 'not_found') {
      return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
    }
    if (result.error === 'already_paid') {
      return NextResponse.json({ error: 'Já marcado como pago' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
