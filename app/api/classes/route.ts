import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function GET() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
  }

  if (!['professor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Admin vê todas as turmas da academia, professor vê só as suas
  let query = supabase
    .from('classes')
    .select('id, name, start_time, end_time, weekdays')
    .eq('academy_id', profile.academy_id)
    .order('start_time', { ascending: true })

  if (profile.role === 'professor') {
    query = query.eq('professor_id', user.id)
  }

  const { data: classes, error } = await query

  if (error) return NextResponse.json({ error: 'Erro ao buscar turmas' }, { status: 500 })

  return NextResponse.json({ classes: classes ?? [] })
}

const createClassSchema = z.object({
  name: z.string().min(1),
  professor_id: z.string().uuid(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
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

  let body: z.infer<typeof createClassSchema>
  try {
    body = createClassSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verifica que o professor pertence à academia
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

  const { data: newClass, error } = await supabase
    .from('classes')
    .insert({
      academy_id: profile.academy_id,
      name: body.name,
      professor_id: body.professor_id,
      weekdays: body.weekdays,
      start_time: body.start_time,
      end_time: body.end_time,
    })
    .select('id')
    .single()

  if (error || !newClass) {
    return NextResponse.json({ error: 'Erro ao criar turma' }, { status: 500 })
  }

  return NextResponse.json({ success: true, class_id: newClass.id })
}
