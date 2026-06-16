import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validação dos dados textuais via Zod
const contractSchema = z.object({
  title: z.string().min(2, 'O título deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = createClient()
  const adminSupabase = createStorageAdminClient()

  try {
    // 1. Validar sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Buscar profile do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, academy_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.academy_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Validar se role é admin ou professor
    if (profile.role !== 'admin' && profile.role !== 'professor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 4. Ler FormData
    const formData = await request.formData()
    const title = formData.get('title') as string | null
    const description = formData.get('description') as string | null
    const file = formData.get('file') as File | null

    // 5. Validar presença do arquivo
    if (!file) {
      return NextResponse.json({ error: 'Arquivo do contrato ausente' }, { status: 400 })
    }

    // Validar título e descrição com Zod
    const validation = contractSchema.safeParse({ title, description })
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }

    // 6. Validar tipo de arquivo
    const fileName = file.name.toLowerCase()
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'
    const isDocx = fileName.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (!isPdf && !isDocx) {
      return NextResponse.json({ error: 'Tipo de arquivo inválido. Apenas PDF e DOCX são permitidos.' }, { status: 400 })
    }

    const fileType = isPdf ? 'pdf' : 'docx'

    // 7. Inserir primeiro o registro no banco para obter o UUID do contrato
    const { data: contract, error: insertError } = await supabase
      .from('contracts')
      .insert({
        academy_id: profile.academy_id,
        title: validation.data.title,
        description: validation.data.description || null,
        file_url: 'temp', // Provisório
        file_type: fileType,
        created_by: user.id,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertError || !contract) {
      console.error('Erro ao inserir contrato no banco:', insertError)
      return NextResponse.json({ error: 'Erro ao registrar contrato no banco de dados' }, { status: 500 })
    }

    // 8. Converter arquivo para buffer e fazer upload no Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const filePath = `${profile.academy_id}/${contract.id}.${fileType}`

    const { error: uploadError } = await adminSupabase.storage
      .from('contracts')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Erro no upload do arquivo para o storage:', uploadError)
      // Excluir registro temporário para manter consistência
      await supabase.from('contracts').delete().eq('id', contract.id)
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
    }

    // 9. Atualizar file_url com o caminho correto no Storage
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ file_url: filePath })
      .eq('id', contract.id)

    if (updateError) {
      console.error('Erro ao atualizar URL do arquivo no banco:', updateError)
      return NextResponse.json({ error: 'Erro ao associar arquivo ao contrato' }, { status: 500 })
    }

    return NextResponse.json({
      id: contract.id,
      title: validation.data.title,
      file_url: filePath,
    })
  } catch (err) {
    console.error('Erro inesperado no cadastro de contrato:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET() {
  const supabase = createClient()

  try {
    // 1. Validar sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Buscar profile do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('academy_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.academy_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Buscar todos os contratos da academia do usuário, ordenados por data decrescente
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, title, description, file_url, file_type, created_at, is_active')
      .eq('academy_id', profile.academy_id)
      .order('created_at', { ascending: false })

    if (contractsError) {
      console.error('Erro ao buscar contratos:', contractsError)
      return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
    }

    // 4. Buscar todas as assinaturas associadas a estes contratos para somar o contador
    const contractIds = (contracts ?? []).map((c) => c.id)
    const { data: signatures, error: signaturesError } = contractIds.length
      ? await supabase
          .from('contract_signatures')
          .select('contract_id')
          .in('contract_id', contractIds)
      : { data: [], error: null }

    if (signaturesError) {
      console.error('Erro ao buscar assinaturas de contratos:', signaturesError)
      return NextResponse.json({ error: 'Erro ao processar contagem de assinaturas' }, { status: 500 })
    }

    // Mapear contadores de assinaturas
    const signatureCountMap = new Map<string, number>()
    for (const sig of signatures ?? []) {
      signatureCountMap.set(sig.contract_id, (signatureCountMap.get(sig.contract_id) ?? 0) + 1)
    }

    // 5. Retornar dados combinados
    const responseData = (contracts ?? []).map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      file_url: c.file_url,
      file_type: c.file_type,
      created_at: c.created_at,
      is_active: c.is_active,
      signature_count: signatureCountMap.get(c.id) ?? 0,
    }))

    return NextResponse.json(responseData)
  } catch (err) {
    console.error('Erro inesperado na listagem de contratos:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
