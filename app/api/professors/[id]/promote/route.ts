import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verifica que o alvo é professor da mesma academia
  const { data: target } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', params.id)
    .eq('academy_id', adminProfile.academy_id)
    .eq('role', 'professor')
    .single()

  if (!target) {
    return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', params.id)

  if (error) {
    console.error('Erro ao promover professor:', error)
    return NextResponse.json({ error: 'Erro ao promover professor' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
