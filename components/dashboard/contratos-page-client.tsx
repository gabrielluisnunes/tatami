'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Users } from 'lucide-react'
import { formatLocalDate } from '@/lib/format-date'
import { ContratoNovoModal } from './contrato-novo-modal'
import { ContratoAssinaturasModal } from './contrato-assinaturas-modal'

// Client component para listagem de contratos
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
  
  // Controle de estados dos modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedContractSignatures, setSelectedContractSignatures] = useState<{ id: string; title: string } | null>(null)

  // Recarrega os dados da página após criar um contrato
  const handleCreated = () => {
    setIsNewModalOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contratos</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie os contratos da academia</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 shadow-md shadow-indigo-600/10"
        >
          <Plus className="h-4 w-4" />
          Novo contrato
        </button>
      </div>

      {/* Grid de Contratos */}
      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 mb-4">
            <FileText className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300">Nenhum contrato cadastrado</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-[280px]">
            Crie seu primeiro contrato para que os alunos possam assinar digitalmente.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => {
            const percentage = totalStudents > 0 
              ? Math.min(100, Math.round((contract.signature_count / totalStudents) * 100))
              : 0

            return (
              <div 
                key={contract.id} 
                className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-4 shadow-xl"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-zinc-100 font-semibold text-lg line-clamp-1">{contract.title}</h3>
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider bg-zinc-800 text-zinc-300 uppercase shrink-0 ring-1 ring-zinc-700">
                      {contract.file_type}
                    </span>
                  </div>
                  {contract.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">{contract.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-500 font-medium">
                    Criado em {formatLocalDate(contract.created_at)}
                  </p>
                </div>

                {/* Progresso de Assinatura */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">
                      {contract.signature_count} de {totalStudents} assinaram
                    </span>
                    <span className="text-indigo-400 font-semibold">{percentage}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Botões */}
                <button
                  onClick={() => setSelectedContractSignatures({ id: contract.id, title: contract.title })}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                >
                  <Users className="h-4 w-4" />
                  Ver assinaturas
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modais */}
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
