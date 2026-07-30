'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, Pencil, Trash2, X, Loader2, Users, AlertTriangle
} from 'lucide-react'

interface Professor {
  id: string
  full_name: string
}

interface TurmaActionsProps {
  turma: {
    id: string
    name: string
    professor_id: string
    professor_name: string
    weekdays: number[]
    start_time: string
    end_time: string
  }
  professors: Professor[]
}

const WEEKDAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatWeekdays(days: number[]): string {
  return [...days].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(', ')
}

interface AttendanceStudent {
  student_id: string
  full_name: string
  count: number
}

const inputClass =
  'border border-zinc-200 rounded-lg px-3.5 py-2 text-sm text-zinc-900 bg-white placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full disabled:opacity-60'
const labelClass = 'block text-sm font-medium text-zinc-700 mb-1.5'

export function TurmaActions({ turma, professors }: TurmaActionsProps) {
  const router = useRouter()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen]       = useState(false)
  const [deleteOpen, setDeleteOpen]   = useState(false)

  // Ver detalhes
  const [students, setStudents]           = useState<AttendanceStudent[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError]   = useState<string | null>(null)

  async function openDetails() {
    setDetailsOpen(true)
    setLoadingDetails(true)
    setDetailsError(null)
    try {
      const res = await fetch(`/api/classes/${turma.id}/attendance`)
      if (!res.ok) throw new Error('Erro ao buscar presenças')
      const data = await res.json()
      setStudents(data.students ?? [])
    } catch {
      setDetailsError('Não foi possível carregar as presenças.')
    } finally {
      setLoadingDetails(false)
    }
  }

  // Editar
  const [editName, setEditName]         = useState(turma.name)
  const [editProfId, setEditProfId]     = useState(turma.professor_id)
  const [editWeekdays, setEditWeekdays] = useState<number[]>(turma.weekdays)
  const [editStart, setEditStart]       = useState(turma.start_time)
  const [editEnd, setEditEnd]           = useState(turma.end_time)
  const [editLoading, setEditLoading]   = useState(false)
  const [editError, setEditError]       = useState<string | null>(null)

  const toggleEditWeekday = (day: number) => {
    setEditWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function openEdit() {
    setEditName(turma.name)
    setEditProfId(turma.professor_id)
    setEditWeekdays(turma.weekdays)
    setEditStart(turma.start_time)
    setEditEnd(turma.end_time)
    setEditError(null)
    setEditOpen(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (editWeekdays.length === 0) {
      setEditError('Selecione ao menos um dia da semana.')
      return
    }
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/classes/${turma.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:         editName,
          professor_id: editProfId,
          weekdays:     editWeekdays,
          start_time:   editStart,
          end_time:     editEnd,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao atualizar turma')
      }
      setEditOpen(false)
      router.refresh()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar turma')
    } finally {
      setEditLoading(false)
    }
  }

  // Excluir
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  async function handleDelete() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/classes/${turma.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao excluir turma')
      }
      setDeleteOpen(false)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Erro ao excluir turma')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={openDetails}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Eye className="h-3.5 w-3.5" />
          Ver detalhes
        </button>
        <button
          type="button"
          onClick={openEdit}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </div>

      {/* MODAL: VER DETALHES */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setDetailsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{turma.name}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formatWeekdays(turma.weekdays)} · {turma.start_time} – {turma.end_time} · {turma.professor_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 mb-3">
                <Users className="h-4 w-4 text-zinc-400" />
                Alunos presentes
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : detailsError ? (
                <p className="text-center text-xs text-red-500 py-6">{detailsError}</p>
              ) : students.length === 0 ? (
                <p className="text-center text-xs text-zinc-400 py-6">
                  Nenhuma presença registrada nesta turma ainda.
                </p>
              ) : (
                <div className="rounded-xl border border-zinc-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Aluno</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500">Presenças</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s.student_id} className="border-b border-zinc-100 last:border-0">
                          <td className="px-3 py-2.5 text-zinc-700">{s.full_name}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              i === 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}>
                              {s.count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !editLoading && setEditOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Editar turma</h2>
              <button
                type="button"
                onClick={() => !editLoading && setEditOpen(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleEdit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div>
                  <label className={labelClass}>Nome da turma</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    disabled={editLoading}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Professor responsável</label>
                  <select
                    value={editProfId}
                    onChange={e => setEditProfId(e.target.value)}
                    disabled={editLoading}
                    required
                    className={inputClass}
                  >
                    {professors.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Dias da semana</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleEditWeekday(day.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          editWeekdays.includes(day.value)
                            ? 'bg-indigo-600 text-white'
                            : 'border border-zinc-200 text-zinc-600 hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Início</label>
                    <input
                      type="time"
                      value={editStart}
                      onChange={e => setEditStart(e.target.value)}
                      onClick={e => e.currentTarget.showPicker?.()}
                      style={{ colorScheme: 'light' }}
                      required
                      disabled={editLoading}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Fim</label>
                    <input
                      type="time"
                      value={editEnd}
                      onChange={e => setEditEnd(e.target.value)}
                      onClick={e => e.currentTarget.showPicker?.()}
                      style={{ colorScheme: 'light' }}
                      required
                      disabled={editLoading}
                      className={`${inputClass} cursor-pointer`}
                    />
                  </div>
                </div>

                {editError && (
                  <p className="text-xs text-red-500">{editError}</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading || !editName || !editProfId || editWeekdays.length === 0}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => !deleteLoading && setDeleteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Excluir turma</h2>
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteOpen(false)}
                className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Tem certeza que deseja excluir a turma{' '}
                  <strong className="text-amber-900">&quot;{turma.name}&quot;</strong>?
                  O histórico de check-ins realizados nessa turma será preservado.
                  Apenas a turma será removida do sistema.
                </p>
              </div>

              {deleteError && (
                <p className="text-xs text-red-500">{deleteError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-5 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteLoading}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="rounded-lg bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
