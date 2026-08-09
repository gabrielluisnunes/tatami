import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Download } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import { ContratoAssinaturaForm } from '@/components/aluno/contrato-assinatura-form'

export default async function AlunoContratoAssinaturaPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id || profile.role !== 'aluno') {
    redirect('/dashboard')
  }

  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, description, file_url, file_type, is_active')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!contract || !contract.is_active) {
    redirect('/aluno/contratos')
  }

  const { data: existingSignature } = await supabase
    .from('contract_signatures')
    .select('signed_at')
    .eq('contract_id', params.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existingSignature) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{contract.title}</h1>
          {contract.description && (
            <p className="mt-1 text-sm text-zinc-500">{contract.description}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 py-10 px-6 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-600" />
          <div>
            <p className="font-semibold text-emerald-800">Contrato assinado</p>
            <p className="mt-1 text-xs text-zinc-500">
              Assinado em {formatLocalDate(existingSignature.signed_at)}
            </p>
          </div>
          {contract.file_type === 'docx' && (
            <a
              href={`/api/contracts/${contract.id}/download`}
              download
              className="mt-2 flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar documento assinado
            </a>
          )}
        </div>
        <Link
          href="/aluno/contratos"
          className="block text-center text-sm text-indigo-600 hover:text-indigo-500 transition-colors"
        >
          ← Voltar para contratos
        </Link>
      </div>
    )
  }

  const adminSupabase = createStorageAdminClient()
  const { data: signedUrlData } = await adminSupabase.storage
    .from('contracts')
    .createSignedUrl(contract.file_url, 3600)

  return (
    <div>
      <ContratoAssinaturaForm
        contractId={contract.id}
        title={contract.title}
        description={contract.description}
        fileType={contract.file_type as 'pdf' | 'docx'}
        signedFileUrl={signedUrlData?.signedUrl ?? ''}
      />
    </div>
  )
}
