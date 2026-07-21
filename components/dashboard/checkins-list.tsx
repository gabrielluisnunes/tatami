'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Trash2, X, Loader2 } from 'lucide-react'

interface AttendanceRecord {
  student_id: string
  full_name: string
  source: 'ai' | 'manual'
}

interface CheckinRow {
  id: string
  checked_in_at: string
  class_name: string
  professor_name: string
  status: 'pending' | 'confirmed'
  attendance: AttendanceRecord[]
}

interface CheckinsListProps {
  checkins: CheckinRow[]
}

export function CheckinsList({ checkins }: CheckinsListProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modal de excluir check-in inteiro
  const [deleteCheckinId, setDeleteCheckinId] = useState<string | null>(null)
  const [deleteCheckinName, setDeleteCheckinName] = useState<string>('')
  const [deleteCheckinCount, setDeleteCheckinCount] = useState<number>(0)
  const [deletingCheckin, setDeletingCheckin] = useState(false)
  const [deleteCheckinError, setDeleteCheckinError] = useState<string | null>(null)

  // Modal de remover aluno específico
  const [removeStudent, setRemoveStudent] = useState<{
    checkinId: string
    studentId: string
    studentName: string
  } | null>(null)
  const [removingStudent, setRemovingStudent] = useState(false)
  const [removeStudentError, setRemoveStudentError] = useState<string | null>(null)

  const toggle = (id: string) =>
    setExpandedId(prev => (prev === id ? null : id))

  async function handleDeleteCheckin() {
    if (!deleteCheckinId) return
    setDeletingCheckin(true)
    setDeleteCheckinError(null)
    try {
      const res = await fetch(`/api/checkin/${deleteCheckinId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao excluir check-in')
      }
      setDeleteCheckinId(null)
      router.refresh()
    } catch (err) {
      setDeleteCheckinError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setDeletingCheckin(false)
    }
  }

  async function handleRemoveStudent() {
    if (!removeStudent) return
    setRemovingStudent(true)
    setRemoveStudentError(null)
    try {
      const res = await fetch(
        `/api/checkin/${removeStudent.checkinId}/attendance/${removeStudent.studentId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Erro ao remover aluno')
      }
      setRemoveStudent(null)
      router.refresh()
    } catch (err) {
      setRemoveStudentError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setRemovingStudent(false)
    }
  }

  if (checkins.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        Nenhum check-in registrado ainda.
      </p>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/75">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left font-medium text-gray-500">Data / Hora</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Turma</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Presentes</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="w-12 px-4 py-3 text-right font-medium text-gray-500" />
            </tr>
          </thead>
          <tbody>
            {checkins.map(checkin => {
              const isExpanded = expandedId === checkin.id
              return (
                <React.Fragment key={checkin.id}>
                  <tr
                    onClick={() => toggle(checkin.id)}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-gray-800">
                      {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-800 font-medium">
                      {checkin.class_name === 'Turma excluída' ? (
                        <span className="text-gray-400 italic text-xs">Turma excluída</span>
                      ) : (
                        checkin.class_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{checkin.professor_name}</td>
                    <td className="px-4 py-3 text-gray-800 font-semibold">{checkin.attendance.length}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        checkin.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {checkin.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteCheckinId(checkin.id)
                          setDeleteCheckinName(checkin.class_name)
                          setDeleteCheckinCount(checkin.attendance.length)
                          setDeleteCheckinError(null)
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                        title="Excluir check-in"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>

                  {/* Linha expandida */}
                  {isExpanded && (
                    <tr className="border-b border-gray-100 bg-gray-50/30">
                      <td colSpan={7} className="px-8 py-4">
                        {checkin.attendance.length === 0 ? (
                          <p className="text-xs text-gray-500">Nenhum aluno registrado neste check-in.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {checkin.attendance.map(a => (
                              <span
                                key={a.student_id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm"
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  a.source === 'ai' ? 'bg-indigo-500' : 'bg-gray-400'
                                }`} />
                                {a.full_name}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRemoveStudentError(null)
                                    setRemoveStudent({
                                      checkinId: checkin.id,
                                      studentId: a.student_id,
                                      studentName: a.full_name,
                                    })
                                  }}
                                  className="text-gray-400 hover:text-red-500 transition-colors text-xs ml-1"
                                  title="Remover aluno"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL 1 — Excluir check-in inteiro */}
      {deleteCheckinId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !deletingCheckin && setDeleteCheckinId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Excluir registro de aula?
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Isso removerá a presença de {deleteCheckinCount} aluno
                {deleteCheckinCount !== 1 ? 's' : ''} na aula &quot;{deleteCheckinName}&quot;
                e não poderá ser desfeito.
              </p>
            </div>
            {deleteCheckinError && (
              <p className="text-xs text-red-600">{deleteCheckinError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteCheckinId(null)}
                disabled={deletingCheckin}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCheckin}
                disabled={deletingCheckin}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingCheckin
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Excluindo...</>
                  : 'Excluir registro'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 — Remover aluno específico */}
      {removeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !removingStudent && setRemoveStudent(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Remover aluno desta aula?
              </p>
              <p className="text-xs text-amber-700 mt-1">
                &quot;{removeStudent.studentName}&quot; será removido desta aula e 
                perderá 1 treino na contagem de frequência.
              </p>
            </div>
            {removeStudentError && (
              <p className="text-xs text-red-600">{removeStudentError}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRemoveStudent(null)}
                disabled={removingStudent}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRemoveStudent}
                disabled={removingStudent}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {removingStudent
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Removendo...</>
                  : 'Remover aluno'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
