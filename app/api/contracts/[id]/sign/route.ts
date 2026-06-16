import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const signSchema = z.object({
  signature_base64: z.string().min(1, 'A assinatura base64 é obrigatória'),
  photo_base64:     z.string().min(1, 'A foto base64 é obrigatória'),
  signer_full_name: z.string().min(3, 'Nome completo deve ter ao menos 3 caracteres'),
  signer_cpf:       z.string().length(14, 'CPF deve estar no formato 000.000.000-00'),
  is_minor:         z.boolean(),
  guardian_name:    z.string().optional(),
  guardian_cpf:     z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  try {
    // 1. Validar sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Buscar profile do aluno
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, academy_id')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'aluno' || !profile.academy_id) {
      return NextResponse.json({ error: 'Acesso negado. Apenas alunos podem assinar contratos.' }, { status: 403 })
    }

    // 3. Validar se o contrato existe e está ativo na academia do aluno
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, academy_id, is_active')
      .eq('id', params.id)
      .eq('academy_id', profile.academy_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    if (!contract.is_active) {
      return NextResponse.json({ error: 'Este contrato não está ativo para assinaturas' }, { status: 400 })
    }

    // Verificar se o aluno já assinou o contrato
    const { data: existingSignature } = await supabase
      .from('contract_signatures')
      .select('id')
      .eq('contract_id', contract.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existingSignature) {
      return NextResponse.json({ error: 'Você já assinou este contrato' }, { status: 400 })
    }

    // 4. Validar o corpo da requisição com Zod
    let body: z.infer<typeof signSchema>
    try {
      body = signSchema.parse(await request.json())
      if (body.is_minor && (!body.guardian_name || body.guardian_name.trim().length < 3)) {
        return NextResponse.json(
          { error: 'Nome do responsável legal é obrigatório para menores de idade' },
          { status: 400 }
        )
      }
    } catch {
      return NextResponse.json({ error: 'Dados de assinatura ou foto inválidos' }, { status: 400 })
    }

    // 5. Decodificar a imagem de assinatura (PNG)
    const matchSig = body.signature_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (!matchSig) {
      return NextResponse.json({ error: 'Formato da imagem de assinatura inválido' }, { status: 400 })
    }
    const sigMime = matchSig[1]
    const sigBuffer = Buffer.from(matchSig[2], 'base64')

    // 6. Decodificar a foto de confirmação (JPEG)
    const matchPhoto = body.photo_base64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/)
    if (!matchPhoto) {
      return NextResponse.json({ error: 'Formato da foto de confirmação inválido' }, { status: 400 })
    }
    const photoMime = matchPhoto[1]
    const photoBuffer = Buffer.from(matchPhoto[2], 'base64')

    // Caminhos de arquivos no bucket 'signatures'
    const sigPath = `${profile.academy_id}/${contract.id}/${user.id}_sig.png`
    const photoPath = `${profile.academy_id}/${contract.id}/${user.id}_photo.jpg`

    // 7. Salvar assinatura no bucket 'signatures'
    const { error: sigUploadError } = await adminSupabase.storage
      .from('signatures')
      .upload(sigPath, sigBuffer, {
        contentType: sigMime,
        upsert: true,
      })

    if (sigUploadError) {
      console.error('Erro ao fazer upload da assinatura:', sigUploadError)
      return NextResponse.json({ error: 'Falha ao salvar a imagem da assinatura' }, { status: 500 })
    }

    // 8. Salvar foto no bucket 'signatures'
    const { error: photoUploadError } = await adminSupabase.storage
      .from('signatures')
      .upload(photoPath, photoBuffer, {
        contentType: photoMime,
        upsert: true,
      })

    if (photoUploadError) {
      console.error('Erro ao fazer upload da foto:', photoUploadError)
      // Tentar limpar a assinatura do storage para consistência
      await adminSupabase.storage.from('signatures').remove([sigPath])
      return NextResponse.json({ error: 'Falha ao salvar a foto de confirmação' }, { status: 500 })
    }

    // 9. Extrair endereço IP de cabeçalhos
    const ipAddress = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'

    // 10. Inserir registro na tabela contract_signatures
    const { error: insertError } = await supabase
      .from('contract_signatures')
      .insert({
        contract_id:      contract.id,
        student_id:       user.id,
        academy_id:       profile.academy_id,
        signature_url:    sigPath,
        photo_url:        photoPath,
        ip_address:       ipAddress,
        signed_at:        new Date().toISOString(),
        signer_full_name: body.signer_full_name,
        signer_cpf:       body.signer_cpf,
        is_minor:         body.is_minor,
        guardian_name:    body.guardian_name ?? null,
        guardian_cpf:     body.guardian_cpf  ?? null,
      })

    if (insertError) {
      console.error('Erro ao salvar assinatura no banco:', insertError)
      // Tentar limpar do storage
      await adminSupabase.storage.from('signatures').remove([sigPath, photoPath])
      return NextResponse.json({ error: 'Erro ao registrar assinatura no banco de dados' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Erro inesperado na assinatura do contrato:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
