import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  full_name:       z.string().min(2).optional(),
  birth_date:      z.string().optional().nullable(),
  phone:           z.string().optional().nullable(),
  emergency_phone: z.string().optional().nullable(),
  cep:             z.string().optional().nullable(),
  address:         z.string().optional().nullable(),
  neighborhood:    z.string().optional().nullable(),
  city:            z.string().optional().nullable(),
  state:           z.string().optional().nullable(),
  sports: z.array(z.object({
    sport: z.enum(['jiu-jitsu', 'muay-thai', 'boxe']),
    belt: z.string().optional().nullable(),
    degree: z.number().int().min(0).max(4).default(0),
  })).optional(),
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
    .in('role', ['aluno', 'professor', 'admin'])
    .single()

  if (!student) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 }) 

  let body: z.infer<typeof updateSchema>
  try {
    body = updateSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { sports, ...profileFields } = body

  const { error } = await supabase
    .from('profiles')
    .update(profileFields)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })

  if (sports !== undefined) {
    const storageAdmin = createStorageAdminClient()

    if (sports.length > 0) {
      // Sincronizar profiles com esporte principal
      const primary = sports[0]
      await supabase
        .from('profiles')
        .update({
          sport: primary.sport,
          belt: primary.sport !== 'boxe' ? (primary.belt ?? null) : null,
          degree: primary.sport === 'jiu-jitsu' ? (primary.degree ?? 0) : 0,
        })
        .eq('id', params.id)

      // Buscar esportes atuais do aluno no banco
      const { data: currentSports } = await storageAdmin
        .from('student_sports')
        .select('id, sport')
        .eq('student_id', params.id)

      const currentSportNames = (currentSports ?? []).map(s => s.sport)
      const newSportNames = sports.map(s => s.sport)

      // 1. Deletar esportes que foram removidos
      const sportsToDelete = currentSportNames.filter(s => !newSportNames.includes(s))
      if (sportsToDelete.length > 0) {
        await storageAdmin
          .from('student_sports')
          .delete()
          .eq('student_id', params.id)
          .in('sport', sportsToDelete)
      }

      // 2. Inserir ou atualizar cada esporte
      for (const s of sports) {
        const exists = currentSportNames.includes(s.sport)

        if (exists) {
          // Atualizar faixa/grau do esporte existente
          const { error } = await storageAdmin
            .from('student_sports')
            .update({
              belt: s.sport !== 'boxe' ? (s.belt ?? null) : null,
              degree: s.sport === 'jiu-jitsu' ? (s.degree ?? 0) : 0,
            })
            .eq('student_id', params.id)
            .eq('sport', s.sport)
          if (error) console.error('[PATCH] update student_sports error:', error)
        } else {
          // Inserir novo esporte
          const { error } = await storageAdmin
            .from('student_sports')
            .insert({
              student_id: params.id,
              academy_id: adminProfile.academy_id,
              sport: s.sport,
              belt: s.sport !== 'boxe' ? (s.belt ?? null) : null,
              degree: s.sport === 'jiu-jitsu' ? (s.degree ?? 0) : 0,
            })
          if (error) console.error('[PATCH] insert student_sports error:', error)
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // createClient = sessão; createStorageAdminClient = Auth Admin API (mesmo padrão do enroll)
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (user.id === params.id) {
    return NextResponse.json({ error: 'Você não pode excluir a própria conta' }, { status: 400 })
  }

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
    .in('role', ['aluno', 'professor', 'admin'])
    .single()

  if (!student) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  // profiles não tem FK para auth.users — remover profile (CASCADE limpa student_sports etc.)
  const { error: profileError } = await adminSupabase
    .from('profiles')
    .delete()
    .eq('id', params.id)
    .eq('academy_id', adminProfile.academy_id)

  if (profileError) {
    console.error('[DELETE] profiles delete error:', profileError)
    return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 })
  }

  // Auth pode já não existir (profile órfão) — user_not_found = sucesso idempotente
  const { error: authError } = await adminSupabase.auth.admin.deleteUser(params.id)
  if (authError && authError.code !== 'user_not_found' && authError.status !== 404) {
    console.error('[DELETE] auth.admin.deleteUser error:', authError)
    return NextResponse.json({ error: 'Erro ao excluir membro' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
