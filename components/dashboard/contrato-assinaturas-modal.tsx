'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, CheckCircle2, Clock, Download, FileText } from 'lucide-react'

interface SignatureRecord {
  student_id: string
  full_name: string
  signed: boolean
  signed_at: string | null
  photo_url: string | null
}

interface ContratoAssinaturasModalProps {
  contractId: string
  contractTitle: string
  onClose: () => void
}

export function ContratoAssinaturasModal({ contractId, contractTitle, onClose }: ContratoAssinaturasModalProps) {
  const [loading, setLoading] = useState(true)
  const [signatures, setSignatures] = useState<SignatureRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSignatures() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/contracts/${contractId}/signatures`)
        if (!response.ok) {
          throw new Error('Falha ao carregar lista de assinaturas')
        }
        const data = await response.json()
        setSignatures(data)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar assinaturas')
      } finally {
        setLoading(false)
      }
    }

    fetchSignatures()
  }, [contractId])

  const signedList = signatures.filter((s) => s.signed)
  const pendingList = signatures.filter((s) => !s.signed)

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <div className="pr-4 min-w-0">
            <h2 className="text-base font-semibold text-zinc-900 truncate">{contractTitle}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Status de assinaturas dos alunos</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="shrink-0 p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
              <p className="text-xs text-zinc-500 mt-2">Carregando lista...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs text-red-500">{error}</p>
            </div>
          ) : (
            <>
              {/* Assinaram */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Assinaram ({signedList.length})
                </h3>
                {signedList.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic pl-5">Nenhuma assinatura ainda.</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    {signedList.map((sig) => (
                      <div key={sig.student_id} className="flex items-center gap-3 py-1.5 border-b border-zinc-100 last:border-0">
                        {sig.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sig.photo_url}
                            alt={sig.full_name}
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
                          />
                        ) : (
                          <div className="h-9 w-9 shrink-0 rounded-full bg-zinc-100 ring-1 ring-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-500">
                            {sig.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-zinc-900 truncate block">{sig.full_name}</span>
                          <span className="text-xs text-zinc-500">
                            Assinado em {formatDateTime(sig.signed_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a
                            href={`/dashboard/contratos/${contractId}/comprovante/${sig.student_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                            title="Ver comprovante de assinatura"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`/api/contracts/${contractId}/download?student_id=${sig.student_id}`}
                            download
                            className="flex items-center justify-center p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                            title="Baixar documento assinado (DOCX)"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pendentes */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Pendentes ({pendingList.length})
                </h3>
                {pendingList.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic pl-5">Nenhum aluno pendente.</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    {pendingList.map((sig) => (
                      <div key={sig.student_id} className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium text-zinc-700">{sig.full_name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                          Pendente
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100">
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
