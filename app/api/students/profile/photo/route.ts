import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const faceDescriptorSchema = z.array(z.number()).length(128)
const paymentDueDaySchema = z.number().int().min(1).max(31)

const photoJsonSchema = z.object({
  photo_base64: z.string().min(1),
  face_descriptor: faceDescriptorSchema,
  payment_due_day: paymentDueDaySchema.optional(),
})

type ParsedPhoto = {
  buffer: Buffer
  mimeType: string
  faceDescriptor: number[]
  paymentDueDay?: number
}

function extensionFor(mimeType: string) {
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  return 'jpeg'
}

/** Campo ausente não altera o dia. Valor presente e inválido é rejeitado. */
function parsePaymentDueDay(raw: unknown): { ok: true; value?: number } | { ok: false } {
  if (raw === undefined || raw === null || raw === '') return { ok: true }
  const numeric = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  const parsed = paymentDueDaySchema.safeParse(numeric)
  if (!parsed.success) return { ok: false }
  return { ok: true, value: parsed.data }
}

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  if (value === null || typeof value === 'string') return false
  return typeof value.arrayBuffer === 'function'
}

function parseDescriptorField(raw: FormDataEntryValue | null): number[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null
  try {
    const parsed = faceDescriptorSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function parseDataUrl(photoBase64: string): { buffer: Buffer; mimeType: string } | null {
  const matches = photoBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
  if (!matches) return null
  return {
    mimeType: matches[1],
    buffer: Buffer.from(matches[2], 'base64'),
  }
}

async function parsePhotoRequest(request: Request): Promise<
  { ok: true; photo: ParsedPhoto } | { ok: false; error: string }
> {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return { ok: false, error: 'Dados inválidos (FormData)' }
    }

    const file = formData.get('photo')
    if (!isUploadedFile(file)) {
      return { ok: false, error: 'Foto não enviada' }
    }

    const faceDescriptor = parseDescriptorField(formData.get('face_descriptor'))
    if (!faceDescriptor) {
      return { ok: false, error: 'É necessário detectar o rosto para atualizar a foto' }
    }

    const dueDay = parsePaymentDueDay(formData.get('payment_due_day'))
    if (!dueDay.ok) {
      return { ok: false, error: 'Dia de vencimento inválido' }
    }

    const mimeType = file.type || 'image/jpeg'
    return {
      ok: true,
      photo: {
        buffer: Buffer.from(await file.arrayBuffer()),
        mimeType,
        faceDescriptor,
        paymentDueDay: dueDay.value,
      },
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { ok: false, error: 'Dados inválidos' }
  }

  const parsed = photoJsonSchema.safeParse(body)
  if (!parsed.success) {
    const dayIssue = parsed.error.issues.some(issue => issue.path[0] === 'payment_due_day')
    const faceIssue = parsed.error.issues.some(issue => issue.path[0] === 'face_descriptor')
    if (faceIssue) {
      return { ok: false, error: 'É necessário detectar o rosto para atualizar a foto' }
    }
    if (dayIssue) {
      return { ok: false, error: 'Dia de vencimento inválido' }
    }
    return { ok: false, error: 'Dados inválidos' }
  }

  const image = parseDataUrl(parsed.data.photo_base64)
  if (!image) {
    return { ok: false, error: 'Formato de imagem inválido' }
  }

  return {
    ok: true,
    photo: {
      buffer: image.buffer,
      mimeType: image.mimeType,
      faceDescriptor: parsed.data.face_descriptor,
      paymentDueDay: parsed.data.payment_due_day,
    },
  }
}

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

  const parsed = await parsePhotoRequest(request)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const { buffer, mimeType, faceDescriptor, paymentDueDay } = parsed.photo
  const ext = extensionFor(mimeType)
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
    face_descriptor: faceDescriptor,
  }
  if (paymentDueDay !== undefined) {
    updateData.payment_due_day = paymentDueDay
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
    photo_url: signedData?.signedUrl ?? filePath,
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
