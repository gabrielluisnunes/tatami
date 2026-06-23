import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const profileSchema = z.object({
  full_name:    z.string().min(2).optional(),
  phone:        z.string().optional(),
  photo_base64: z.string().optional(),
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

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof profileSchema>
  try {
    body = profileSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.full_name !== undefined) updates.full_name = body.full_name
  if (body.phone !== undefined)     updates.phone = body.phone

  if (body.photo_base64) {
    const matches = body.photo_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (!matches) return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 400 })

    const mimeType = matches[1]
    const buffer   = Buffer.from(matches[2], 'base64')
    const ext      = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpeg'
    const filePath = `${profile.academy_id}/${user.id}.${ext}`

    const adminStorage = createStorageAdminClient()
    let { error: uploadError } = await adminStorage.storage
      .from('admin-photos')
      .upload(filePath, buffer, { contentType: mimeType, upsert: true })

    if (uploadError && uploadError.message?.includes('bucket not found')) {
      const { error: bucketError } = await adminStorage.storage.createBucket('admin-photos', {
        public: false,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880,
      })
      if (bucketError) {
        console.error('Erro ao criar bucket:', bucketError)
        return NextResponse.json({ error: 'Erro ao configurar o armazenamento' }, { status: 500 })
      }
      
      const { error: retryError } = await adminStorage.storage
        .from('admin-photos')
        .upload(filePath, buffer, { contentType: mimeType, upsert: true })
      uploadError = retryError
    }

    if (uploadError) {
      console.error('Erro ao salvar foto admin:', uploadError)
      return NextResponse.json({ error: 'Erro ao salvar foto' }, { status: 500 })
    }

    updates.photo_url = filePath
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum dado para atualizar' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (updateError) {
    console.error('Erro ao atualizar perfil:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }

  return NextResponse.json({ success: true, photo_url: updates.photo_url ?? undefined })
}
