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

  // Dividir a lista em assinados e pendentes
  const signedList = signatures.filter((s) => s.signed)
  const pendingList = signatures.filter((s) => !s.signed)

  // Formatar data e hora local
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto px-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md mx-auto mt-24 relative shadow-2xl flex flex-col max-h-[70vh]">
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Título */}
        <div className="mb-4 pr-6">
          <h2 className="text-lg font-bold text-zinc-100 line-clamp-1">{contractTitle}</h2>
          <p className="text-xs text-zinc-500 mt-1">Status de assinaturas dos alunos</p>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1 py-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs text-zinc-500 mt-2">Carregando lista...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Seção: Assinaram */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Assinaram ({signedList.length})
                </h3>
                {signedList.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic pl-5">Nenhuma assinatura ainda.</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    {signedList.map((sig) => (
                      <div key={sig.student_id} className="flex items-center gap-3 py-1.5 border-b border-zinc-800/60 last:border-0">
                        {/* Foto do aluno */}
                        {sig.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sig.photo_url}
                            alt={sig.full_name}
                            className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                          />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                            {sig.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-zinc-200 truncate block">{sig.full_name}</span>
                          <span className="text-[10px] text-zinc-500">
                            Assinado em {formatDateTime(sig.signed_at)}
                          </span>
                        </div>
                        {/* Ações */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Ver comprovante */}
                          <a
                            href={`/dashboard/contratos/${contractId}/comprovante/${sig.student_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Ver comprovante de assinatura"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </a>
                          {/* Baixar DOCX */}
                          <a
                            href={`/api/contracts/${contractId}/download?student_id=${sig.student_id}`}
                            download
                            className="flex items-center justify-center p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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

              {/* Seção: Pendentes */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  Pendentes ({pendingList.length})
                </h3>
                {pendingList.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic pl-5">Nenhum aluno pendente.</p>
                ) : (
                  <div className="space-y-2 pl-5">
                    {pendingList.map((sig) => (
                      <div key={sig.student_id} className="flex items-center justify-between py-1">
                        <span className="text-xs font-medium text-zinc-200">{sig.full_name}</span>
                        <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
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

        {/* Rodapé */}
        <div className="border-t border-zinc-800/80 pt-4 mt-4 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="rounded-xl border border-zinc-700 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
