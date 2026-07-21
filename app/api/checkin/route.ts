import { createStorageAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const checkinSchema = z.object({
  class_id: z.string().uuid(),
  photo_base64: z.string().min(1),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const storageClient = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id || !['professor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof checkinSchema>
  try {
    body = checkinSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Verifica que a turma pertence à academia
  const { data: classData } = await supabase
    .from('classes')
    .select('id, name')
    .eq('id', body.class_id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!classData) {
    return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 })
  }

  // Upload da foto de grupo para checkin-photos/
  let photo_url = ''
  try {
    const base64Data = body.photo_base64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const mimeMatch = body.photo_base64.match(/^data:(image\/\w+);base64,/)
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
    const ext = mimeType.split('/')[1] || 'jpg'

    const timestamp = Date.now()
    const filePath = `${profile.academy_id}/${body.class_id}/${timestamp}.${ext}`

    const { error: uploadError } = await storageClient.storage
      .from('checkin-photos')
      .upload(filePath, buffer, { contentType: mimeType, upsert: false })

    if (uploadError) throw uploadError

    // Gera signed URL com 7 dias de validade (bucket privado)
    const { data: signedData } = await storageClient.storage
      .from('checkin-photos')
      .createSignedUrl(filePath, 60 * 60 * 24 * 7)

    photo_url = signedData?.signedUrl ?? ''
  } catch (err) {
    console.error('Erro ao fazer upload da foto de check-in:', err)
    return NextResponse.json({ error: 'Falha ao salvar foto' }, { status: 500 })
  }

  // Cria registro do check-in com status 'pending'
  const { data: checkin, error: checkinError } = await supabase
    .from('checkins')
    .insert({
      academy_id: profile.academy_id,
      class_id: body.class_id,
      class_name: classData.name,
      professor_id: user.id,
      photo_url,
      status: 'pending',
    })
    .select('id')
    .single()

  if (checkinError || !checkin) {
    return NextResponse.json({ error: 'Erro ao registrar check-in' }, { status: 500 })
  }

  return NextResponse.json({ checkin_id: checkin.id, photo_url })
}
