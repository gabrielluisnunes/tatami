import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteMember, updateMember } from '@/lib/services/students.service'

const updateSchema = z.object({
  full_name: z.string().min(2).optional(),
  birth_date: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  emergency_phone: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  sports: z.array(z.object({
    sport: z.enum(['jiu-jitsu', 'muay-thai', 'boxe']),
    belt: z.string().optional().nullable(),
    degree: z.number().int().min(0).max(4).default(0),
  })).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

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

  let body: z.infer<typeof updateSchema>
  try {
    body = updateSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const result = await updateMember(
    supabase,
    adminSupabase,
    params.id,
    adminProfile.academy_id,
    body,
  )

  if (!result.ok) {
    if (result.error === 'not_found') {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

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

  const result = await deleteMember(
    supabase,
    adminSupabase,
    params.id,
    adminProfile.academy_id,
    user.id,
  )

  if (!result.ok) {
    if (result.error === 'cannot_delete_self') {
      return NextResponse.json({ error: 'Você não pode excluir a própria conta' }, { status: 400 })
    }
    if (result.error === 'not_found') {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
