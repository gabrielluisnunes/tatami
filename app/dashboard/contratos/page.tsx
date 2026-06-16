import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ContratosPageClient } from '@/components/dashboard/contratos-page-client'

// Página de contratos do painel administrativo

export default async function DashboardContratosPage() {
  const supabase = createClient()

  // 1. Validar sessão do usuário
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 2. Buscar profile e validar role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id) {
    redirect('/onboarding')
  }

  if (profile.role !== 'admin' && profile.role !== 'professor') {
    redirect('/dashboard')
  }

  // 3. Buscar o total de alunos da academia
  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')

  const studentCount = totalStudents ?? 0

  // 4. Buscar todos os contratos cadastrados na academia
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, title, description, file_url, file_type, created_at')
    .eq('academy_id', profile.academy_id)
    .order('created_at', { ascending: false })

  // 5. Buscar assinaturas desses contratos para compor a contagem
  const contractIds = (contracts ?? []).map((c) => c.id)
  const { data: signatures } = contractIds.length
    ? await supabase
        .from('contract_signatures')
        .select('contract_id')
        .in('contract_id', contractIds)
    : { data: [] }

  const signatureCountMap = new Map<string, number>()
  for (const sig of signatures ?? []) {
    signatureCountMap.set(sig.contract_id, (signatureCountMap.get(sig.contract_id) ?? 0) + 1)
  }

  const contractsWithCount = (contracts ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    file_url: c.file_url,
    file_type: c.file_type as 'pdf' | 'docx',
    created_at: c.created_at,
    signature_count: signatureCountMap.get(c.id) ?? 0,
  }))

  return (
    <ContratosPageClient
      contracts={contractsWithCount}
      totalStudents={studentCount}
    />
  )
}
