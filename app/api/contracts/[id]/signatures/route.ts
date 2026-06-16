import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  try {
    // 1. Validar sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // 2. Buscar profile do usuário para validar permissões
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, academy_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.academy_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Exigir role 'admin' ou 'professor'
    if (profile.role !== 'admin' && profile.role !== 'professor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Buscar todos os alunos da academia
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('academy_id', profile.academy_id)
      .eq('role', 'aluno')

    if (studentsError) {
      console.error('Erro ao buscar alunos da academia:', studentsError)
      return NextResponse.json({ error: 'Erro ao buscar alunos da academia' }, { status: 500 })
    }

    // 4. Buscar todas as assinaturas registradas para este contrato específico
    const { data: signatures, error: signaturesError } = await supabase
      .from('contract_signatures')
      .select('student_id, signed_at, photo_url')
      .eq('contract_id', params.id)

    if (signaturesError) {
      console.error('Erro ao buscar assinaturas do contrato:', signaturesError)
      return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
    }

    // 5. Mapear assinaturas por ID do aluno para busca rápida
    const signatureMap = new Map<string, { signed_at: string; photo_url: string | null }>()
    for (const sig of signatures ?? []) {
      signatureMap.set(sig.student_id, {
        signed_at: sig.signed_at,
        photo_url: sig.photo_url ?? null,
      })
    }

    // 6. Montar a lista completa
    const list = (students ?? []).map((student) => {
      const sigData = signatureMap.get(student.id)
      return {
        student_id: student.id,
        full_name: student.full_name,
        signed: !!sigData,
        signed_at: sigData?.signed_at ?? null,
        photo_url: sigData?.photo_url ?? null,
      }
    })

    // 7. Ordenar: assinados primeiro, depois pendentes; dentro de cada grupo por full_name asc
    // Como a busca já veio do banco ou pode ser ordenada, faremos a ordenação no código de forma explícita.
    const signedList = list.filter((item) => item.signed)
    const pendingList = list.filter((item) => !item.signed)

    // Ordenação alfabética por nome
    const sortByFullName = (a: typeof list[0], b: typeof list[0]) =>
      a.full_name.localeCompare(b.full_name, 'pt-BR')

    signedList.sort(sortByFullName)
    pendingList.sort(sortByFullName)

    const sortedList = [...signedList, ...pendingList]

    const adminSupabase = createStorageAdminClient()

    const listWithSignedUrls = await Promise.all(
      sortedList.map(async (item) => {
        if (!item.photo_url || !item.signed) return item
        try {
          const { data } = await adminSupabase.storage
            .from('signatures')
            .createSignedUrl(item.photo_url, 3600)
          return { ...item, photo_url: data?.signedUrl ?? null }
        } catch {
          return { ...item, photo_url: null }
        }
      })
    )

    return NextResponse.json(listWithSignedUrls)
  } catch (err) {
    console.error('Erro inesperado ao buscar assinaturas do contrato:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
