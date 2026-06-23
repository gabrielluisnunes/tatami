import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const academySchema = z.object({
  name:  z.string().min(2).optional(),
  sport: z.enum(['jiu-jitsu', 'muay thai', 'boxe', 'misto']).optional(),
})

export async function PATCH(request: Request) {
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

  let body: z.infer<typeof academySchema>
  try {
    body = academySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.name !== undefined)  updates.name = body.name
  if (body.sport !== undefined) updates.sport = body.sport

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 })
  }

  const { error } = await supabase
    .from('academies')
    .update(updates)
    .eq('id', profile.academy_id)

  if (error) {
    console.error('Erro ao atualizar academia:', error)
    return NextResponse.json({ error: 'Erro ao atualizar academia' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
