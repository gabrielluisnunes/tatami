import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Download } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import { ContratoAssinaturaForm } from '@/components/aluno/contrato-assinatura-form'

// Página de assinatura individual de contrato do aluno

export default async function AlunoContratoAssinaturaPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // 1. Validar sessão
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 2. Buscar profile do aluno
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id || profile.role !== 'aluno') {
    redirect('/dashboard')
  }

  // 3. Buscar o contrato pelo ID e academy_id
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, description, file_url, file_type, is_active')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  // Redirecionamento silencioso se contrato não for encontrado ou não estiver ativo
  if (!contract || !contract.is_active) {
    redirect('/aluno/contratos')
  }

  // 4. Verificar se o aluno já assinou este contrato
  const { data: existingSignature } = await supabase
    .from('contract_signatures')
    .select('signed_at')
    .eq('contract_id', params.id)
    .eq('student_id', user.id)
    .maybeSingle()

  // 5. Se já assinou, renderizar a tela informativa de "já assinado"
  if (existingSignature) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{contract.title}</h1>
          {contract.description && (
            <p className="mt-1 text-sm text-zinc-400">{contract.description}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-800/40 bg-emerald-950/30 py-10 px-6 text-center shadow-lg">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
          <div>
            <p className="font-semibold text-emerald-300">Contrato assinado</p>
            <p className="mt-1 text-xs text-zinc-500">
              Assinado em {formatLocalDate(existingSignature.signed_at)}
            </p>
          </div>
          {contract.file_type === 'docx' && (
            <a
              href={`/api/contracts/${contract.id}/download`}
              download
              className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar documento assinado
            </a>
          )}
        </div>
        <Link 
          href="/aluno/contratos" 
          className="block text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          ← Voltar para contratos
        </Link>
      </div>
    )
  }

  // 6. Caso contrário, gerar URL assinada para visualização/download
  const adminSupabase = createStorageAdminClient()
  const { data: signedUrlData } = await adminSupabase.storage
    .from('contracts')
    .createSignedUrl(contract.file_url, 3600)

  return (
    <ContratoAssinaturaForm
      contractId={contract.id}
      title={contract.title}
      description={contract.description}
      fileType={contract.file_type as 'pdf' | 'docx'}
      signedFileUrl={signedUrlData?.signedUrl ?? ''}
    />
  )
}
