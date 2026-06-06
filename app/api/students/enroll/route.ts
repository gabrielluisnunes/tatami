import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const enrollSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['aluno', 'professor']),
  belt: z.string().default('branca'),
  phone: z.string().optional(),
  photo_base64: z.string().optional(),
  face_descriptor: z.array(z.number()).optional(),
})

export async function POST(request: Request) {
  const supabase = createAdminClient()

  // Autenticação: verifica que quem chama é admin com academia
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile || adminProfile.role !== 'admin' || !adminProfile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Valida body
  let body: z.infer<typeof enrollSchema>
  try {
    const raw = await request.json()
    body = enrollSchema.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  // Cria usuário no Supabase Auth passando metadata completo
  // O trigger handle_new_user vai criar o profile completo automaticamente
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      role: body.role,
      academy_id: adminProfile.academy_id,
      belt: body.belt,
    },
  })

  if (createError || !created.user) {
    if (createError?.message?.includes('already')) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })
  }

  // Lógica de upload e dados adicionais
  const updates: { phone?: string; face_descriptor?: number[]; photo_url?: string } = {}

  if (body.phone) {
    updates.phone = body.phone
  }

  if (body.face_descriptor) {
    updates.face_descriptor = body.face_descriptor
  }

  if (body.photo_base64) {
    const matches = body.photo_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (matches) {
      const mimeType = matches[1]
      const base64Data = matches[2]
      const buffer = Buffer.from(base64Data, 'base64')

      let ext = 'jpg'
      if (mimeType.includes('png')) ext = 'png'
      else if (mimeType.includes('webp')) ext = 'webp'
      else if (mimeType.includes('jpeg')) ext = 'jpeg'

      const filePath = `${adminProfile.academy_id}/${created.user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        })

      if (!uploadError) {
        updates.photo_url = filePath
      } else {
        console.error('Erro ao fazer upload da foto:', uploadError)
      }
    }
  }

  // Aplica todas as atualizações em uma única chamada atômica
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', created.user.id)
  }

  return NextResponse.json({
    success: true,
    user_id: created.user.id,
  })
}
