import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const onboardingSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  sport: z.enum(['jiu-jitsu', 'muay thai', 'boxe', 'misto']),
  due_day: z.number().int().min(1).max(28),
  monthly_price: z.number().min(0),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verify role is admin or not set yet (null)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  if (profile.academy_id) {
    return NextResponse.json({ error: 'Academia já configurada' }, { status: 400 })
  }

  // Validate body
  let body: z.infer<typeof onboardingSchema>
  try {
    const rawBody = await request.json()
    body = onboardingSchema.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Insert academy
  const { data: academy, error: academyError } = await supabase
    .from('academies')
    .insert({
      owner_id: user.id,
      name: body.name,
      sport: body.sport,
      due_day: body.due_day,
      monthly_price: body.monthly_price,
      subscription_status: 'trial',
    })
    .select('id')
    .single()

  if (academyError || !academy) {
    return NextResponse.json({ error: 'Erro ao criar academia' }, { status: 500 })
  }

  // Update profile with academy_id, full_name, and role as admin
  const { error: nameError } = await supabase
    .from('profiles')
    .update({ 
      academy_id: academy.id,
      full_name: body.full_name,
      role: 'admin'
    })
    .eq('id', user.id)

  if (nameError) {
    return NextResponse.json({ error: 'Erro ao salvar perfil' }, { status: 500 })
  }

  return NextResponse.json({ success: true, academy_id: academy.id })
}
