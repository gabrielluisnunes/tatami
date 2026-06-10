import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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

  // Garante que o registro pertence à academia do admin
  const { data: financial } = await supabase
    .from('financials')
    .select('id, status')
    .eq('id', body.financial_id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!financial) return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  if (financial.status === 'paid') {
    return NextResponse.json({ error: 'Já marcado como pago' }, { status: 409 })
  }

  const { error } = await supabase
    .from('financials')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', body.financial_id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })

  return NextResponse.json({ success: true })
}
