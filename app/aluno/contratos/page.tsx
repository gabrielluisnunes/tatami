import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ChevronRight, Check, Download } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import { ContratosSuccessBanner } from '@/components/aluno/contratos-success-banner'
import { Suspense } from 'react'

export default async function AlunoContratosPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id, title, description, file_type, created_at,
      contract_signatures!left (student_id, signed_at)
    `)
    .eq('academy_id', profile.academy_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao buscar contratos do aluno:', error)
  }

  const mappedContracts = (contracts ?? []).map((c) => {
    const userSig = c.contract_signatures?.find((s: { student_id: string }) => s.student_id === user.id)
    return {
      id: c.id,
      title: c.title,
      description: c.description,
      file_type: c.file_type as 'pdf' | 'docx',
      created_at: c.created_at,
      signed: !!userSig,
      signed_at: userSig?.signed_at ?? null,
    }
  })

  const pendingList = mappedContracts.filter((c) => !c.signed)
  const signedList  = mappedContracts.filter((c) => c.signed)

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <ContratosSuccessBanner />
      </Suspense>

      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Contratos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Documentos da academia</p>
      </div>

      {mappedContracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <FileText className="h-6 w-6 text-zinc-400 mb-2" />
          <p className="text-sm text-zinc-500">Nenhum contrato ativo cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Pendentes de assinatura */}
          {pendingList.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Pendentes ({pendingList.length})
              </h2>
              <div className="space-y-2">
                {pendingList.map((contract) => (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-zinc-200 border-l-[3px] border-l-amber-500 bg-white px-4 py-3 space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-medium text-zinc-900 text-sm">{contract.title}</h3>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase shrink-0">
                          {contract.file_type}
                        </span>
                      </div>
                      {contract.description && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                          {contract.description}
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-2">
                        Publicado em {formatLocalDate(contract.created_at)}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <Link
                        href={`/aluno/contratos/${contract.id}`}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
                      >
                        Assinar
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinados */}
          {signedList.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Assinados ({signedList.length})
              </h2>
              <div className="space-y-2">
                {signedList.map((contract) => (
                  <div
                    key={contract.id}
                    className="rounded-xl border border-zinc-200 border-l-[3px] border-l-emerald-500 bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-zinc-900 text-sm truncate">{contract.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Assinado em {formatLocalDate(contract.signed_at!)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                          {contract.file_type}
                        </span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50">
                          <Check className="h-3 w-3 text-emerald-600" />
                        </span>
                      </div>
                    </div>
                    {contract.file_type === 'docx' && (
                      <div className="mt-3 pt-3 border-t border-zinc-100">
                        <a
                          href={`/api/contracts/${contract.id}/download`}
                          download
                          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors w-fit"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar DOCX
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
