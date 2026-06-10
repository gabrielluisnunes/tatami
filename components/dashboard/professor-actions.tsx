'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2, ShieldCheck, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProfessorActionsProps {
  professorId:   string
  professorName: string
}

type Modal = 'none' | 'promote' | 'delete'

export function ProfessorActions({ professorId, professorName }: ProfessorActionsProps) {
  const router = useRouter()
  const [modal,   setModal]   = useState<Modal>('none')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const closeModal = () => { setModal('none'); setError(null) }

  const handlePromote = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/professors/${professorId}/promote`, { method: 'PATCH' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao promover')
      }
      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao promover professor')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/${professorId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao excluir')
      }
      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir professor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Link href={`/dashboard/professores/${professorId}/editar`}>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 rounded-lg p-0 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setModal('promote')}
          className="h-7 w-7 rounded-lg p-0 text-zinc-500 hover:bg-indigo-900/30 hover:text-indigo-400"
          title="Promover a co-admin"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setModal('delete')}
          className="h-7 w-7 rounded-lg p-0 text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Modal de promoção */}
      {modal === 'promote' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && closeModal()}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950/50">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-zinc-100">Promover a co-admin</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              <span className="font-semibold text-zinc-200">{professorName}</span> passará a ter acesso total ao dashboard, incluindo financeiro e gerenciamento de alunos. Esta ação não pode ser desfeita por aqui.
            </p>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePromote}
                disabled={loading}
                className="flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Promover'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exclusão */}
      {modal === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !loading && closeModal()}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/50">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <h3 className="text-base font-bold text-zinc-100">Excluir professor</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Tem certeza que deseja excluir <span className="font-semibold text-zinc-200">{professorName}</span>? Esta ação não pode ser desfeita.
            </p>
            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-700 font-semibold text-white hover:bg-red-600"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
