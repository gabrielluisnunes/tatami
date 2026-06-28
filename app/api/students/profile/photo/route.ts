import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const photoSchema = z.object({
  photo_base64:    z.string().min(1),
  face_descriptor: z.array(z.number()).length(128),
  payment_due_day: z.number().int().min(1).max(31),
})

export async function PATCH(request: Request) {
  const supabase      = createClient()
  const adminSupabase = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'aluno' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof photoSchema>
  try {
    body = photoSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Extrai tipo e dados do base64
  const matches = body.photo_base64.match(
    /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/
  )
  if (!matches) {
    return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 400 })
  }

  const mimeType = matches[1]
  const buffer   = Buffer.from(matches[2], 'base64')
  const ext      = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
    ? 'webp'
    : 'jpeg'
  const filePath = `${profile.academy_id}/${user.id}.${ext}`

  // Upload para o bucket student-photos (adminSupabase ignora RLS do Storage)
  const { error: uploadError } = await adminSupabase.storage
    .from('student-photos')
    .upload(filePath, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) {
    console.error('Erro ao salvar foto no storage:', uploadError)
    return NextResponse.json({ error: 'Erro ao salvar foto' }, { status: 500 })
  }

  // Atualiza profile (createClient respeita RLS — aluno pode atualizar o próprio registro com a policy apropriada)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      photo_url:       filePath,
      face_descriptor: body.face_descriptor,
      payment_due_day: body.payment_due_day,
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('Erro ao atualizar perfil com foto e descriptor:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
