import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateClassSchema = z.object({
  name:         z.string().min(1).optional(),
  professor_id: z.string().uuid().optional(),
  weekdays:     z.array(z.number().int().min(0).max(6)).min(1).optional(),
  start_time:   z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time:     z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
})

export async function PATCH(
  request: Request,
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

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verifica que a turma pertence à academia do admin
  const { data: existingClass } = await supabase
    .from('classes')
    .select('id')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!existingClass) {
    return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
  }

  let body: z.infer<typeof updateClassSchema>
  try {
    body = updateClassSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Se professor_id foi enviado, verifica que pertence à academia
  if (body.professor_id) {
    const { data: professor } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', body.professor_id)
      .eq('academy_id', profile.academy_id)
      .in('role', ['professor', 'admin'])
      .single()

    if (!professor) {
      return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
    }
  }

  const { error } = await supabase
    .from('classes')
    .update(body)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar turma' }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
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

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Verifica que a turma pertence à academia do admin
  const { data: existingClass } = await supabase
    .from('classes')
    .select('id')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!existingClass) {
    return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
  }

  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao excluir turma' }, { status: 500 })

  return NextResponse.json({ success: true })
}
