'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2, ShieldCheck, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProfessorActionsProps {
  professorId:   string
  professorName: string
  role:          string
}

type Modal = 'none' | 'promote' | 'delete'

export function ProfessorActions({ professorId, professorName, role }: ProfessorActionsProps) {
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
            className="h-7 w-7 rounded-lg p-0 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
        {role !== 'admin' && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setModal('promote')}
            className="h-7 w-7 rounded-lg p-0 text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600"
            title="Promover a co-admin"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setModal('delete')}
          className="h-7 w-7 rounded-lg p-0 text-zinc-400 hover:bg-red-50 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Modal de promoção */}
      {modal === 'promote' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
            onClick={() => !loading && closeModal()}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Promover a co-admin</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              <span className="font-semibold text-zinc-800">{professorName}</span> passará a ter acesso total ao dashboard, incluindo financeiro e gerenciamento de alunos. Esta ação não pode ser desfeita por aqui.
            </p>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50"
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
            className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
            onClick={() => !loading && closeModal()}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 border border-red-200">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">Excluir professor</h3>
            <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-zinc-800">{professorName}</span>? Esta ação não pode ser desfeita.
            </p>
            {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={loading}
                className="flex-1 rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-500"
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
