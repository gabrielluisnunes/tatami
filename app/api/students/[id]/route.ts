import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  full_name:       z.string().min(2).optional(),
  phone:           z.string().optional().nullable(),
  emergency_phone: z.string().optional().nullable(),
  belt:            z.string().optional(),
  cep:             z.string().optional().nullable(),
  address:         z.string().optional().nullable(),
  neighborhood:    z.string().optional().nullable(),
  city:            z.string().optional().nullable(),
  state:           z.string().optional().nullable(),
})

export async function PATCH(
  request: Request,
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

  // Verifica que o membro pertence à academia do admin
  const { data: student } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', params.id)
    .eq('academy_id', adminProfile.academy_id)
    .in('role', ['aluno', 'professor'])
    .single()

  if (!student) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 }) 

  let body: z.infer<typeof updateSchema>
  try {
    body = updateSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(body)                   
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Usa createClient para verificar sessão, createAdminClient para deletar
  const supabase      = createClient()
  const adminSupabase = createAdminClient()

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

  // Verifica que o membro pertence à academia antes de deletar
  const { data: student } = await supabase
    .from('profiles')               
    .select('id')
    .eq('id', params.id)
    .eq('academy_id', adminProfile.academy_id)
    .in('role', ['aluno', 'professor'])
    .single()

  if (!student) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  // Deleta do Supabase Auth — o CASCADE do banco remove o profile automaticamente
  const { error } = await adminSupabase.auth.admin.deleteUser(params.id)

  if (error) return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 })  

  return NextResponse.json({ success: true })
}
