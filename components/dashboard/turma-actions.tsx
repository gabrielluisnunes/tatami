'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Eye, Pencil, Trash2, X, Loader2, Users, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

const inputClass = "rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
const labelClass = "text-xs font-semibold text-zinc-400"

export function TurmaActions({ turma, professors }: TurmaActionsProps) {
  const router = useRouter()

  // ── MODAL ESTADOS ──────────────────────────────────────────────
  const [detailsOpen, setDetailsOpen]   = useState(false)
  const [editOpen, setEditOpen]         = useState(false)
  const [deleteOpen, setDeleteOpen]     = useState(false)

  // ── VER DETALHES ───────────────────────────────────────────────
  const [students, setStudents]         = useState<AttendanceStudent[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

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

  // ── EDITAR ─────────────────────────────────────────────────────
  const [editName, setEditName]           = useState(turma.name)
  const [editProfId, setEditProfId]       = useState(turma.professor_id)
  const [editWeekdays, setEditWeekdays]   = useState<number[]>(turma.weekdays)
  const [editStart, setEditStart]         = useState(turma.start_time)
  const [editEnd, setEditEnd]             = useState(turma.end_time)
  const [editLoading, setEditLoading]     = useState(false)
  const [editError, setEditError]         = useState<string | null>(null)

  const toggleEditWeekday = (day: number) => {
    setEditWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function openEdit() {
    // Reseta para os valores atuais da turma
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

  // ── EXCLUIR ────────────────────────────────────────────────────
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

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <>
      {/* Botões de ação */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={openDetails}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Eye className="h-3.5 w-3.5" />
          Ver detalhes
        </button>
        <button
          type="button"
          onClick={openEdit}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={() => { setDeleteError(null); setDeleteOpen(true) }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      </div>

      {/* ── MODAL: VER DETALHES ──────────────────────────────────── */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDetailsOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">{turma.name}</h2>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-1 text-xs text-zinc-500">
              {formatWeekdays(turma.weekdays)} · {turma.start_time} – {turma.end_time}
            </p>
            <p className="mb-5 text-xs text-zinc-500">
              Professor: {turma.professor_name}
            </p>

            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
              <Users className="h-4 w-4 text-zinc-500" />
              Alunos presentes
            </div>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              </div>
            ) : detailsError ? (
              <p className="text-center text-xs text-red-400 py-6">{detailsError}</p>
            ) : students.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-6">
                Nenhuma presença registrada nesta turma ainda.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60 bg-zinc-900/60">
                      <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500">Aluno</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500">Presenças</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.student_id} className="border-b border-zinc-800/40 last:border-0">
                        <td className="px-3 py-2.5 text-zinc-200">{s.full_name}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            i === 0
                              ? 'bg-indigo-600/20 text-indigo-700'
                              : 'bg-zinc-800 text-zinc-400'
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

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDITAR ───────────────────────────────────────── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !editLoading && setEditOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Editar turma</h2>
              <button
                type="button"
                onClick={() => !editLoading && setEditOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label className={labelClass}>Nome da turma</Label>
                <Input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  disabled={editLoading}
                  className={inputClass}
                />
              </div>

              {/* Professor */}
              <div className="space-y-1.5">
                <Label className={labelClass}>Professor responsável</Label>
                <select
                  value={editProfId}
                  onChange={e => setEditProfId(e.target.value)}
                  disabled={editLoading}
                  required
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {professors.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Dias da semana */}
              <div className="space-y-2">
                <Label className={labelClass}>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleEditWeekday(day.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        editWeekdays.includes(day.value)
                          ? 'bg-indigo-600 text-white'
                          : 'border border-zinc-700 text-zinc-400 hover:border-indigo-600 hover:text-indigo-400'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Início</Label>
                  <Input
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
                <div className="space-y-1.5">
                  <Label className={labelClass}>Fim</Label>
                  <Input
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
                <p className="text-xs text-red-400">{editError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
                  className="flex-1 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading || !editName || !editProfId || editWeekdays.length === 0}
                  className="flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
                >
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EXCLUIR ──────────────────────────────────────── */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteLoading && setDeleteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-100">Excluir turma</h2>
              <button
                type="button"
                onClick={() => !deleteLoading && setDeleteOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 flex gap-3 rounded-xl border border-amber-800/40 bg-amber-950/30 p-4">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <p className="text-sm text-amber-200">
                Tem certeza que deseja excluir a turma{' '}
                <strong className="text-amber-100">&quot;{turma.name}&quot;</strong>?
                O histórico de check-ins realizados nessa turma será preservado.
                Apenas a turma será removida do sistema.
              </p>
            </div>

            {deleteError && (
              <p className="mb-3 text-xs text-red-400">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={deleteLoading}
                className="flex-1 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-500"
              >
                {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir turma'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
