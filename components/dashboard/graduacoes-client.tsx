'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, History, X, Loader2, Award, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GraduationModal } from '@/components/dashboard/graduation-modal'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string
  full_name: string
  belt: string
  degree: number
  trainings_since_belt: number
  attendance_rate: number
  total_classes_since_belt: number
}

interface HistoryItem {
  id: string
  belt: string
  degree: number
  graded_at: string
  notes: string | null
  trainings_at_graduation: number | null
  graded_by_name: string | null
  trainings_in_period: number
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

function formatDuration(fromIso: string, toIso?: string): string {
  const from = new Date(fromIso)
  const to   = toIso ? new Date(toIso) : new Date()
  const days = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 30) return `${days} dia${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} mês${months !== 1 ? 'es' : ''}`
  const years     = Math.floor(months / 12)
  const remMonths = months % 12
  if (remMonths === 0) return `${years} ano${years !== 1 ? 's' : ''}`
  return `${years} ano${years !== 1 ? 's' : ''} e ${remMonths} mês${remMonths !== 1 ? 'es' : ''}`
}

function attendanceColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (rate >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

// ── Componente ───────────────────────────────────────────────────────────────

export function GraduacoesClient({ students }: GraduacoesClientProps) {
  const [search, setSearch]               = useState('')
  const [historyOpen, setHistoryOpen]     = useState(false)
  const [loadingId, setLoadingId]         = useState<string | null>(null)
  const [historyError, setHistoryError]   = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [history, setHistory]             = useState<HistoryItem[]>([])

  const filtered = useMemo(() =>
    search.trim().length === 0
      ? students
      : students.filter(s =>
          s.full_name.toLowerCase().includes(search.trim().toLowerCase())
        ),
    [students, search]
  )

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

  // trainings_since_belt não vem da API — buscar da prop students
  const currentStudentRow = studentDetail
    ? students.find(s => s.id === studentDetail.id) ?? null
    : null

  return (
    <>
      {/* ── Tabela de alunos com busca ─────────────────────────────── */}
      <div className="space-y-4">

        {/* Barra de busca */}
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

        {/* Banner de erro */}
        {historyError && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-xs text-red-600">{historyError}</p>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Frequência</th>
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
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${attendanceColor(student.attendance_rate)}`}>
                        {student.attendance_rate.toFixed(1)}%
                      </span>
                      {student.attendance_rate < 80 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Mínimo: 80%
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
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

            {/* Header */}
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

            {/* Card de resumo — faixa atual + treinos desde última graduação */}
            {currentStudentRow && (
              <div className="mx-6 mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-700">
                    {studentDetail.belt.charAt(0).toUpperCase() + studentDetail.belt.slice(1)}
                    {studentDetail.degree > 0 ? ` — ${studentDetail.degree}º grau` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {currentStudentRow.trainings_since_belt} treino{currentStudentRow.trainings_since_belt !== 1 ? 's' : ''} desde a última graduação
                  </span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${attendanceColor(currentStudentRow.attendance_rate)}`}>
                    {currentStudentRow.attendance_rate.toFixed(1)}% de frequência
                  </span>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                // Empty state melhorado
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                    beltColors[studentDetail.belt.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
                  }`}>
                    {studentDetail.belt.charAt(0).toUpperCase() + studentDetail.belt.slice(1)}
                    {studentDetail.degree > 0 && (
                      <span className="tracking-tighter opacity-60">{'●'.repeat(studentDetail.degree)}</span>
                    )}
                  </span>
                  <p className="text-sm text-gray-500">Nenhuma promoção registrada ainda.</p>
                  <p className="text-xs text-gray-400">
                    {studentDetail.full_name.split(' ')[0]} está nessa faixa desde que entrou na academia
                    {currentStudentRow
                      ? ` · ${currentStudentRow.trainings_since_belt} treino${currentStudentRow.trainings_since_belt !== 1 ? 's' : ''} no total`
                      : ''
                    }.
                  </p>
                </div>
              ) : (
                <div className="relative pl-5">
                  {/* Linha vertical da timeline */}
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-100" />

                  <div className="space-y-4">
                    {history.map((item, idx) => {
                      const beltKey  = item.belt.toLowerCase()
                      const dotColor = beltDotColors[beltKey] ?? 'bg-gray-400'
                      const badgeColor = beltColors[beltKey] ?? 'bg-gray-200 text-gray-700'
                      const isFirst  = idx === 0

                      // Duração: de graded_at[idx] até graded_at[idx-1] (mais recente no array DESC) ou agora
                      const periodEnd = idx === 0 ? undefined : history[idx - 1].graded_at
                      const duration  = formatDuration(item.graded_at, periodEnd)

                      const trainingsInPeriod = item.trainings_in_period

                      return (
                        <div key={item.id} className="relative flex gap-4">
                          {/* Dot */}
                          <div className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white ${dotColor} ${
                            isFirst ? 'ring-2 ring-indigo-400/50' : ''
                          }`} />

                          {/* Card */}
                          <div className={`flex-1 rounded-xl border p-4 space-y-2 ${
                            isFirst
                              ? 'border-indigo-200 bg-indigo-50'
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
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 border border-indigo-300">
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
                              <p className="text-xs text-gray-500">{item.degree}º grau</p>
                            )}

                            {/* Duração + treinos no período */}
                            <div className="flex items-center gap-1 flex-wrap text-xs text-gray-400">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{isFirst ? `há ${duration}` : duration} nessa faixa</span>
                              {trainingsInPeriod != null && (
                                <span>· {trainingsInPeriod} treino{trainingsInPeriod !== 1 ? 's' : ''} nesse período</span>
                              )}
                            </div>

                            {item.graded_by_name && (
                              <p className="text-xs text-gray-400">Graduado por {item.graded_by_name}</p>
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

                    {/* Item sintético — Início na academia */}
                    <div className="relative flex gap-4">
                      <div className="relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white bg-gray-300" />
                      <div className="flex-1 rounded-xl border border-dashed border-gray-200 p-4 space-y-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-500">Início na academia</span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {new Date(studentDetail.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric'
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDuration(studentDetail.created_at)} de academia
                        </p>
                      </div>
                    </div>

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
