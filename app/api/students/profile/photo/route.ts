import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const photoSchema = z.object({
  photo_base64:    z.string().min(1),
  face_descriptor: z.array(z.number()).length(128),
  payment_due_day: z.number().int().min(1).max(31),
})

export async function PATCH(request: Request) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await adminSupabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'aluno' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let buffer: Buffer
  let mimeType: string
  let ext: string
  let faceDescriptor: number[] | null = null

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await request.formData()
      const file = formData.get('photo') as File | null
      if (!file) {
        return NextResponse.json({ error: 'Foto não enviada' }, { status: 400 })
      }
      const arrayBuffer = await file.arrayBuffer()
      buffer = Buffer.from(arrayBuffer)
      mimeType = file.type || 'image/jpeg'
      ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpeg'
    } catch {
      return NextResponse.json({ error: 'Dados inválidos (FormData)' }, { status: 400 })
    }
  } else {
    try {
      const bodyJson = await request.json()
      const body = photoSchema.parse(bodyJson)
      faceDescriptor = body.face_descriptor

      const matches = body.photo_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
      if (!matches) {
        return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 400 })
      }

      mimeType = matches[1]
      buffer = Buffer.from(matches[2], 'base64')
      ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpeg'
    } catch {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
  }

  const filePath = `${profile.academy_id}/${user.id}.${ext}`

  const { error: uploadError } = await adminSupabase.storage
    .from('student-photos')
    .upload(filePath, buffer, { contentType: mimeType, upsert: true })

  if (uploadError) {
    console.error('Erro ao salvar foto no storage:', uploadError)
    return NextResponse.json({ error: 'Erro ao salvar foto no storage' }, { status: 500 })
  }

  const updateData: Record<string, unknown> = {
    photo_url: filePath,
  }
  if (faceDescriptor) {
    updateData.face_descriptor = faceDescriptor
  }

  const { error: updateError } = await adminSupabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)

  if (updateError) {
    console.error('Erro ao atualizar perfil no banco:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar perfil no banco' }, { status: 500 })
  }

  const { data: signedData } = await adminSupabase.storage
    .from('student-photos')
    .createSignedUrl(filePath, 3600)

  return NextResponse.json({ 
    success: true, 
    photo_url: signedData?.signedUrl ?? filePath 
  })
}

export async function GET() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const adminSupabase = createStorageAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('full_name, photo_url')
    .eq('id', user.id)
    .single()

  let photoUrl = profile?.photo_url ?? null
  if (photoUrl && !photoUrl.startsWith('http') && !photoUrl.startsWith('data:')) {
    const { data } = await adminSupabase.storage
      .from('student-photos')
      .createSignedUrl(photoUrl, 3600)
    photoUrl = data?.signedUrl ?? null
  }

  return NextResponse.json({
    full_name: profile?.full_name ?? '',
    photo_url: photoUrl,
  })
}
