'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Users } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import { ContratoNovoModal } from './contrato-novo-modal'
import { ContratoAssinaturasModal } from './contrato-assinaturas-modal'

interface ContractItem {
  id: string
  title: string
  description: string | null
  file_url: string
  file_type: 'pdf' | 'docx'
  created_at: string
  signature_count: number
}

interface ContratosPageClientProps {
  contracts: ContractItem[]
  totalStudents: number
}

export function ContratosPageClient({ contracts, totalStudents }: ContratosPageClientProps) {
  const router = useRouter()
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedContractSignatures, setSelectedContractSignatures] = useState<{ id: string; title: string } | null>(null)

  const handleCreated = () => {
    setIsNewModalOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Contratos</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gerencie os contratos da academia</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Novo contrato
        </button>
      </div>

      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 mb-4">
            <FileText className="h-7 w-7 text-zinc-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-700">Nenhum contrato cadastrado</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-[280px]">
            Crie seu primeiro contrato para que os alunos possam assinar digitalmente.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => {
            const percentage = totalStudents > 0
              ? Math.min(100, Math.round((contract.signature_count / totalStudents) * 100))
              : 0

            return (
              <div
                key={contract.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-zinc-900 font-semibold text-sm line-clamp-1">{contract.title}</h3>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase shrink-0">
                      {contract.file_type}
                    </span>
                  </div>
                  {contract.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{contract.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-400">
                    Criado em {formatLocalDate(contract.created_at)}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">
                      {contract.signature_count} de {totalStudents} assinaram
                    </span>
                    <span className="text-indigo-600 font-semibold">{percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => setSelectedContractSignatures({ id: contract.id, title: contract.title })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
                >
                  <Users className="h-4 w-4" />
                  Ver assinaturas
                </button>
              </div>
            )
          })}
        </div>
      )}

      {isNewModalOpen && (
        <ContratoNovoModal
          onCreated={handleCreated}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {selectedContractSignatures && (
        <ContratoAssinaturasModal
          contractId={selectedContractSignatures.id}
          contractTitle={selectedContractSignatures.title}
          onClose={() => setSelectedContractSignatures(null)}
        />
      )}
    </div>
  )
}
