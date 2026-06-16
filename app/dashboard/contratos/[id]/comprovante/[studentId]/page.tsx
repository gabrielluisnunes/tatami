import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { PrintButton } from '@/components/dashboard/print-button'
import { DownloadButton } from '@/components/dashboard/download-button'

export default async function ComprovantePage({
  params,
}: {
  params: { id: string; studentId: string }
}) {
  // 1. Autenticação e autorização
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.academy_id) redirect('/dashboard')
  if (profile.role !== 'admin' && profile.role !== 'professor') redirect('/dashboard')

  // 2. Buscar o contrato
  const { data: contract } = await supabase
    .from('contracts')
    .select('id, title, description, file_type, academy_id')
    .eq('id', params.id)
    .eq('academy_id', profile.academy_id)
    .single()

  if (!contract) redirect('/dashboard/contratos')

  // 3. Buscar a assinatura
  const { data: signature } = await supabase
    .from('contract_signatures')
    .select('id, signature_url, photo_url, signed_at, ip_address, student_id, signer_full_name, signer_cpf, is_minor, guardian_name, guardian_cpf')
    .eq('contract_id', params.id)
    .eq('student_id', params.studentId)
    .maybeSingle()

  if (!signature) redirect('/dashboard/contratos')

  // 4. Buscar o nome do aluno
  const { data: student } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', params.studentId)
    .single()

  const studentName = student?.full_name ?? 'Aluno'

  // 5. Gerar signed URLs das imagens (TTL 1 hora)
  const adminSupabase = createStorageAdminClient()

  const { data: sigUrlData } = await adminSupabase.storage
    .from('signatures')
    .createSignedUrl(signature.signature_url, 3600)

  const { data: photoUrlData } = await adminSupabase.storage
    .from('signatures')
    .createSignedUrl(signature.photo_url, 3600)

  const signatureImgUrl = sigUrlData?.signedUrl ?? null
  const photoImgUrl = photoUrlData?.signedUrl ?? null

  // 6. Formatar data da assinatura
  const signedAtFormatted = new Date(signature.signed_at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

  return (
    <>
      {/* CSS de impressão injetado inline — esconde sidebar e zera margin */}
      <style>{`
        @media print {
          aside { display: none !important; }
          main { margin-left: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          body { background-color: white !important; }
        }
      `}</style>

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header com botões */}
        <div className="flex items-center justify-between no-print border-b border-zinc-800 pb-4">
          <Link
            href="/dashboard/contratos"
            className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            &larr; Voltar para Contratos
          </Link>
          <div className="flex items-center gap-3">
            <PrintButton />
            <DownloadButton href={`/api/contracts/${contract.id}/download?student_id=${params.studentId}`} />
          </div>
        </div>

        {/* Comprovante */}
        <div className="bg-white text-zinc-900 p-8 rounded-2xl shadow-xl space-y-6 print:shadow-none print:p-0">
          {/* Logo Tatami */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-6">
            <Logo className="h-8 w-auto text-zinc-900" variant="full" />
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Comprovante de Assinatura</p>
              <p className="text-xs text-zinc-500 mt-1">ID do Contrato: {contract.id.substring(0, 8)}</p>
            </div>
          </div>

          {/* Dados principais da assinatura */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 space-y-5 print:border-zinc-300 print:rounded-none">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-200">
              <div className="h-4 w-1 rounded-full bg-indigo-600" />
              <h1 className="text-base font-bold text-zinc-900 uppercase tracking-widest">
                Comprovante de Assinatura Eletrônica
              </h1>
            </div>

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Contrato
                </dt>
                <dd className="text-sm font-semibold text-zinc-900">{contract.title}</dd>
                {contract.description && (
                  <dd className="text-xs text-zinc-500 mt-0.5">{contract.description}</dd>
                )}
              </div>

              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Assinante
                </dt>
                <dd className="text-sm font-semibold text-zinc-900">{studentName}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Data e hora da assinatura
                </dt>
                <dd className="text-sm text-zinc-900">{signedAtFormatted}</dd>
              </div>

              <div>
                <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  IP registrado
                </dt>
                <dd className="text-sm font-mono text-zinc-900">
                  {signature.ip_address ?? 'não registrado'}
                </dd>
              </div>

              {/* CPF do assinante */}
              {signature.signer_cpf && (
                <div>
                  <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    CPF do assinante
                  </dt>
                  <dd className="text-sm font-mono text-zinc-900">{signature.signer_cpf}</dd>
                </div>
              )}

              {/* Se for menor de idade */}
              {signature.is_minor && (
                <>
                  <div>
                    <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                      Menor de idade
                    </dt>
                    <dd className="text-sm text-zinc-900">Sim — assinatura por responsável legal</dd>
                  </div>

                  {signature.guardian_name && (
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Responsável legal
                      </dt>
                      <dd className="text-sm font-semibold text-zinc-900">{signature.guardian_name}</dd>
                    </div>
                  )}

                  {signature.guardian_cpf && (
                    <div>
                      <dt className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        CPF do responsável
                      </dt>
                      <dd className="text-sm font-mono text-zinc-900">{signature.guardian_cpf}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Imagens lado a lado */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Foto de confirmação */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Foto de confirmação
              </p>
              {photoImgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoImgUrl}
                  alt={`Foto de ${studentName}`}
                  className="w-full rounded-xl border border-zinc-200 object-cover aspect-square print:rounded-none"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-dashed border-zinc-300 flex items-center justify-center bg-zinc-50">
                  <p className="text-xs text-zinc-400">Foto indisponível</p>
                </div>
              )}
            </div>

            {/* Assinatura digital */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Assinatura digital
              </p>
              {signatureImgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signatureImgUrl}
                  alt="Assinatura digital"
                  className="w-full rounded-xl border border-zinc-200 object-contain aspect-square bg-white p-4 print:rounded-none print:p-2"
                />
              ) : (
                <div className="w-full aspect-square rounded-xl border border-dashed border-zinc-300 flex items-center justify-center bg-zinc-50">
                  <p className="text-xs text-zinc-400">Assinatura indisponível</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 pt-6 text-center">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Este documento foi assinado eletronicamente pela plataforma Tatami. 
              A autenticidade pode ser verificada pelos dados acima.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
