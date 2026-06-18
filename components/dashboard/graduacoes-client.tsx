'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, History, X, Loader2, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GraduationModal } from '@/components/dashboard/graduation-modal'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string
  full_name: string
  belt: string
  degree: number
  trainings_since_belt: number
}

interface HistoryItem {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  graded_by_name: string | null
}

interface StudentDetail {
  id: string
  full_name: string
  belt: string
  degree: number
  photo_url: string | null
  created_at: string
}

interface GraduacoesClientProps {
  students: StudentRow[]
}

// ── Constantes ───────────────────────────────────────────────────────────────

const beltColors: Record<string, string> = {
  branca: 'bg-gray-100 text-gray-900 border border-gray-300',
  azul:   'bg-blue-600 text-white',
  roxa:   'bg-purple-700 text-white',
  marrom: 'bg-amber-800 text-white',
  preta:  'bg-gray-900 text-white',
}

const beltDotColors: Record<string, string> = {
  branca: 'bg-gray-300',
  azul:   'bg-blue-400',
  roxa:   'bg-purple-400',
  marrom: 'bg-amber-600',
  preta:  'bg-gray-900',
}

// ── Componente ───────────────────────────────────────────────────────────────

export function GraduacoesClient({ students }: GraduacoesClientProps) {
  const [search, setSearch]             = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingId, setLoadingId]     = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [history, setHistory]         = useState<HistoryItem[]>([])

  // Filtro de busca
  const filtered = useMemo(() =>
    search.trim().length === 0
      ? students
      : students.filter(s =>
          s.full_name.toLowerCase().includes(search.trim().toLowerCase())
        ),
    [students, search]
  )

  // Abrir modal de histórico
  const openHistory = useCallback(async (studentId: string) => {
    setLoadingId(studentId)
    setHistoryError(null)
    try {
      const res = await fetch(`/api/graduations/${studentId}`)
      if (!res.ok) throw new Error('Erro ao carregar histórico')
      const data = await res.json()
      setStudentDetail(data.student)
      setHistory(data.history)
      setHistoryOpen(true)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Erro ao carregar histórico')
    } finally {
      setLoadingId(null)
    }
  }, [])

  const closeHistory = useCallback(() => {
    setHistoryOpen(false)
    setStudentDetail(null)
    setHistory([])
    setHistoryError(null)
  }, [])

  return (
    <>
      {/* ── Tabela de alunos com busca ─────────────────────────────── */}
      <div className="space-y-4">

        {/* Barra de busca + botão graduar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar aluno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Erro de carregamento de histórico */}
        {historyError && (
          <div className="rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
            <p className="text-xs text-red-400">{historyError}</p>
          </div>
        )}

        {/* Tabela */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-10 text-center">
            <p className="text-sm text-gray-400">
              {search ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum aluno cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Aluno</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Faixa atual</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Treinos</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <tr key={student.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-800">{student.full_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        beltColors[student.belt.toLowerCase()] ?? 'bg-gray-200 text-gray-700'
                      }`}>
                        {student.belt.charAt(0).toUpperCase() + student.belt.slice(1)}
                        {student.degree > 0 && (
                          <span className="tracking-tighter opacity-60">{'●'.repeat(student.degree)}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {student.trainings_since_belt} treino{student.trainings_since_belt !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão Ver histórico */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openHistory(student.id)}
                          disabled={loadingId === student.id}
                          className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        >
                          {loadingId === student.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <History className="h-3.5 w-3.5" />
                          }
                          Histórico
                        </Button>
                        {/* Botão Graduar */}
                        <GraduationModal students={[student]} inlineButton />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de histórico ────────────────────────────────────────── */}
      {historyOpen && studentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeHistory}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">

            {/* Header do modal */}
            <div className="flex items-center gap-4 p-6 border-b border-gray-200">
              {studentDetail.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={studentDetail.photo_url}
                  alt={studentDetail.full_name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-gray-200"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-bold text-gray-500 ring-2 ring-gray-200">
                  {studentDetail.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{studentDetail.full_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    beltColors[studentDetail.belt.toLowerCase()] ?? 'bg-gray-200 text-gray-700'
                  }`}>
                    {studentDetail.belt.charAt(0).toUpperCase() + studentDetail.belt.slice(1)}
                    {studentDetail.degree > 0 && (
                      <span className="tracking-tighter opacity-60">{'●'.repeat(studentDetail.degree)}</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">faixa atual</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeHistory}
                className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline de histórico */}
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Award className="h-8 w-8 mb-3 text-gray-400" />
                  <p className="text-sm text-gray-400">Nenhuma graduação registrada ainda.</p>
                </div>
              ) : (
                <div className="relative pl-5">
                  {/* Linha vertical da timeline */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-100" />

                  <div className="space-y-4">
                    {history.map((item, idx) => {
                      const beltKey = item.belt.toLowerCase()
                      const dotColor = beltDotColors[beltKey] ?? 'bg-gray-400'
                      const badgeColor = beltColors[beltKey] ?? 'bg-gray-200 text-gray-700'
                      const isFirst = idx === 0

                      return (
                        <div key={item.id} className="relative flex gap-4">
                          {/* Dot da timeline */}
                          <div className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white ${dotColor} ${
                            isFirst ? 'ring-2 ring-indigo-500/40' : ''
                          }`} />

                          {/* Card */}
                          <div className={`flex-1 rounded-xl border p-4 space-y-2 ${
                            isFirst
                              ? 'border-indigo-800/40 bg-indigo-950/20'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                                {item.belt.charAt(0).toUpperCase() + item.belt.slice(1)}
                                {item.degree > 0 && (
                                  <span className="tracking-tighter opacity-60">{'●'.repeat(item.degree)}</span>
                                )}
                              </span>
                              {isFirst && (
                                <span className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-600/20">
                                  Mais recente
                                </span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto">
                                {new Date(item.graded_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit', month: 'long', year: 'numeric'
                                })}
                              </span>
                            </div>

                            {item.degree > 0 && (
                              <p className="text-xs text-gray-500">
                                {item.degree}º grau
                              </p>
                            )}

                            {item.trainings_at_graduation != null && (
                              <p className="text-xs text-gray-400">
                                {item.trainings_at_graduation} treino{item.trainings_at_graduation !== 1 ? 's' : ''} acumulados
                              </p>
                            )}

                            {item.graded_by_name && (
                              <p className="text-xs text-gray-400">
                                Graduado por {item.graded_by_name}
                              </p>
                            )}

                            {item.notes && (
                              <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-2">
                                {`"${item.notes}"`}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <Button
                variant="outline"
                onClick={closeHistory}
                className="rounded-xl border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
