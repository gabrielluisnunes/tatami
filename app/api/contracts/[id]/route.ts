import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
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

    // 2. Buscar profile do usuário para obter o academy_id e role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, academy_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.academy_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Buscar contrato por id, garantindo que pertence à academia do usuário
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, title, description, file_url, file_type, academy_id, is_active')
      .eq('id', params.id)
      .eq('academy_id', profile.academy_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    // 4. Se o usuário for aluno, verificar se ele já assinou este contrato
    let alreadySigned = false
    if (profile.role === 'aluno') {
      const { data: signature, error: sigError } = await supabase
        .from('contract_signatures')
        .select('id')
        .eq('contract_id', contract.id)
        .eq('student_id', user.id)
        .maybeSingle()

      if (sigError) {
        console.error('Erro ao verificar assinatura prévia do aluno:', sigError)
      }
      alreadySigned = !!signature
    }

    // 5. Gerar URL assinada (signed URL) para o arquivo no bucket 'contracts' (válida por 1 hora)
    const { data: signedData, error: signedError } = await adminSupabase.storage
      .from('contracts')
      .createSignedUrl(contract.file_url, 3600)

    if (signedError || !signedData?.signedUrl) {
      console.error('Erro ao gerar URL assinada do contrato:', signedError)
      return NextResponse.json({ error: 'Erro ao obter link seguro do contrato' }, { status: 500 })
    }

    // 6. Retornar resposta formatada
    return NextResponse.json({
      id: contract.id,
      title: contract.title,
      description: contract.description,
      file_type: contract.file_type,
      signed_file_url: signedData.signedUrl,
      already_signed: alreadySigned,
    })
  } catch (err) {
    console.error('Erro inesperado ao buscar contrato por ID:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
