'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Search, History, X, Loader2, Award, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GraduationModal } from '@/components/dashboard/graduation-modal'

// ── Tipos ───────────────────────────────────────────────────────────────────

interface StudentRow {
  id: string
  full_name: string
  belt: string
  degree: number
  sport: string
  trainings_since_belt: number
  attendance_rate: number | null
  total_classes_since_belt: number
}

interface SportEntry {
  sport: string
  belt: string
  degree: number
  trainings_since_belt: number
  attendance_rate: number | null
  total_classes_since_belt: number
}

interface GroupedStudent {
  id: string
  full_name: string
  sports: SportEntry[]
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
  sport?: string
}

interface StudentDetail {
  id: string
  full_name: string
  belt: string
  degree: number
  sport?: string
  photo_url: string | null
  created_at: string
}

interface GraduacoesClientProps {
  students: StudentRow[]
}

// ── Constantes ───────────────────────────────────────────────────────────────

const SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  'boxe': 'Boxe',
}

const BELT_LABELS: Record<string, string> = {
  // Jiu-Jitsu
  branca: 'Branca', azul: 'Azul', roxa: 'Roxa', marrom: 'Marrom', preta: 'Preta',
  // Muay Thai
  branco: 'Branco', laranja: 'Laranja', 'azul-mt': 'Azul',
  vermelho: 'Vermelho', amarelo: 'Amarelo', verde: 'Verde',
  'marrom-mt': 'Marrom', 'preto-mt': 'Preto',
}

const beltColors: Record<string, string> = {
  // Jiu-Jitsu
  branca: 'bg-gray-100 text-gray-900 border border-gray-300',
  azul:   'bg-blue-600 text-white',
  roxa:   'bg-purple-700 text-white',
  marrom: 'bg-amber-800 text-white',
  preta:  'bg-gray-900 text-white',
  // Muay Thai
  branco: 'bg-gray-100 text-gray-900 border border-gray-300',
  laranja: 'bg-orange-500 text-white',
  'azul-mt': 'bg-blue-600 text-white',
  vermelho: 'bg-red-600 text-white',
  amarelo: 'bg-yellow-400 text-gray-900',
  verde: 'bg-green-600 text-white',
  'marrom-mt': 'bg-amber-800 text-white',
  'preto-mt': 'bg-gray-900 text-white',
}

const beltDotColors: Record<string, string> = {
  branca: 'bg-gray-300',
  azul:   'bg-blue-400',
  roxa:   'bg-purple-400',
  marrom: 'bg-amber-600',
  preta:  'bg-gray-900',
  // Muay Thai
  branco: 'bg-gray-300',
  laranja: 'bg-orange-400',
  'azul-mt': 'bg-blue-400',
  vermelho: 'bg-red-400',
  amarelo: 'bg-yellow-400',
  verde: 'bg-green-400',
  'marrom-mt': 'bg-amber-600',
  'preto-mt': 'bg-gray-900',
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

function attendanceColor(rate: number | null): string {
  if (rate == null) return 'text-gray-400 bg-gray-50 border-gray-200'
  if (rate >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (rate >= 60) return 'text-amber-600 bg-amber-50 border-amber-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

function toGraduationRow(grouped: GroupedStudent, entry: SportEntry): StudentRow {
  return {
    id: grouped.id,
    full_name: grouped.full_name,
    sport: entry.sport,
    belt: entry.belt,
    degree: entry.degree,
    trainings_since_belt: entry.trainings_since_belt,
    attendance_rate: entry.attendance_rate,
    total_classes_since_belt: entry.total_classes_since_belt,
  }
}

function primaryMetricsSport(sports: SportEntry[]): SportEntry {
  return sports.find(s => s.sport !== 'boxe') ?? sports[0]
}

/** Abre GraduationModal (não controlado) sem segundo clique no Graduar. */
function AutoOpenGraduationModal({
  student,
  onDone,
}: {
  student: StudentRow
  onDone: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const openedRef = useRef(false)

  useEffect(() => {
    openedRef.current = false
    const btn = ref.current?.querySelector(':scope > button')
    if (btn instanceof HTMLButtonElement) {
      btn.click()
    }
    // Marca como aberto após o ModalContent montar
    const t = window.setTimeout(() => {
      openedRef.current = true
    }, 50)
    return () => window.clearTimeout(t)
  }, [student.id, student.sport])

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const observer = new MutationObserver(() => {
      if (!openedRef.current) return
      const overlay = root.querySelector(':scope > .fixed.inset-0')
      if (!overlay) {
        openedRef.current = false
        onDone()
      }
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [onDone, student.id, student.sport])

  return (
    <div
      ref={ref}
      className="[&>button]:pointer-events-none [&>button]:absolute [&>button]:h-0 [&>button]:w-0 [&>button]:overflow-hidden [&>button]:opacity-0"
    >
      <GraduationModal students={[student]} inlineButton />
    </div>
  )
}

// ── Componente ───────────────────────────────────────────────────────────────

export function GraduacoesClient({ students }: GraduacoesClientProps) {
  const [search, setSearch]               = useState('')
  const [historyOpen, setHistoryOpen]     = useState(false)
  const [loadingId, setLoadingId]         = useState<string | null>(null)
  const [historyError, setHistoryError]   = useState<string | null>(null)
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null)
  const [historySport, setHistorySport]   = useState<string | null>(null)
  const [history, setHistory]             = useState<HistoryItem[]>([])
  const [sportSelectModal, setSportSelectModal] = useState<{
    studentId: string
    studentName: string
    sports: SportEntry[]
  } | null>(null)
  const [historySportSelect, setHistorySportSelect] = useState<{
    studentId: string
    studentName: string
    sports: SportEntry[]
  } | null>(null)
  const [graduationTarget, setGraduationTarget] = useState<StudentRow | null>(null)

  const uniqueStudents = useMemo(() => {
    const grouped = students.reduce((acc, student) => {
      if (!acc[student.id]) {
        acc[student.id] = {
          id: student.id,
          full_name: student.full_name,
          sports: [],
        }
      }
      acc[student.id].sports.push({
        sport: student.sport,
        belt: student.belt,
        degree: student.degree,
        trainings_since_belt: student.trainings_since_belt,
        attendance_rate: student.attendance_rate,
        total_classes_since_belt: student.total_classes_since_belt,
      })
      return acc
    }, {} as Record<string, GroupedStudent>)
    return Object.values(grouped)
  }, [students])

  const filtered = useMemo(() =>
    search.trim().length === 0
      ? uniqueStudents
      : uniqueStudents.filter(s =>
          s.full_name.toLowerCase().includes(search.trim().toLowerCase())
        ),
    [uniqueStudents, search]
  )

  const openHistory = useCallback(async (studentId: string, sport: string) => {
    setLoadingId(studentId)
    setHistoryError(null)
    try {
      const res = await fetch(`/api/graduations/${studentId}?sport=${encodeURIComponent(sport)}`)
      if (!res.ok) throw new Error('Erro ao carregar histórico')
      const data = await res.json()
      setStudentDetail(data.student)
      setHistorySport(sport)
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
    setHistorySport(null)
    setHistory([])
    setHistoryError(null)
  }, [])

  const clearGraduationTarget = useCallback(() => {
    setGraduationTarget(null)
  }, [])

  // trainings_since_belt não vem da API — buscar da prop students (por aluno+esporte)
  const currentStudentRow = studentDetail && historySport
    ? students.find(s => s.id === studentDetail.id && s.sport === historySport) ?? null
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
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Aluno</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Esporte</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Graduação</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Treinos</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Frequência</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const metrics = primaryMetricsSport(student.sports)
                  const gradable = student.sports.filter(s => s.sport !== 'boxe')

                  return (
                    <tr key={student.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-3 font-medium text-gray-800">{student.full_name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        <div className="flex flex-wrap gap-1">
                          {student.sports.map(s => (
                            <span
                              key={s.sport}
                              className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                            >
                              {SPORT_LABELS[s.sport] ?? s.sport}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {student.sports.map(s => (
                            s.sport === 'boxe' ? (
                              <span
                                key={s.sport}
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200"
                              >
                                Boxe · Sem graduação
                              </span>
                            ) : (
                              <span
                                key={s.sport}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  beltColors[s.belt.toLowerCase()] ?? 'bg-gray-200 text-gray-700'
                                }`}
                              >
                                {SPORT_LABELS[s.sport]} · {BELT_LABELS[s.belt.toLowerCase()] ?? s.belt}
                                {s.sport === 'jiu-jitsu' && s.degree > 0 && (
                                  <span className="tracking-tighter opacity-60">{'●'.repeat(s.degree)}</span>
                                )}
                              </span>
                            )
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {metrics.trainings_since_belt} treino{metrics.trainings_since_belt !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          metrics.attendance_rate != null
                            ? attendanceColor(metrics.attendance_rate)
                            : 'text-gray-400 bg-gray-50 border-gray-200'
                        }`}>
                          {metrics.attendance_rate != null ? `${metrics.attendance_rate.toFixed(1)}%` : '—'}
                        </span>
                        {metrics.attendance_rate != null && metrics.attendance_rate < 80 && (
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
                            onClick={() => {
                              if (student.sports.length === 1) {
                                openHistory(student.id, student.sports[0].sport)
                              } else {
                                setHistorySportSelect({
                                  studentId: student.id,
                                  studentName: student.full_name,
                                  sports: student.sports,
                                })
                              }
                            }}
                            disabled={loadingId === student.id}
                            className="h-7 gap-1.5 rounded-lg px-2.5 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          >
                            {loadingId === student.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <History className="h-3.5 w-3.5" />
                            }
                            Histórico
                          </Button>
                          {gradable.length === 1 && (
                            <GraduationModal
                              students={[toGraduationRow(student, gradable[0])]}
                              inlineButton
                            />
                          )}
                          {gradable.length > 1 && (
                            <Button
                              size="sm"
                              onClick={() => setSportSelectModal({
                                studentId: student.id,
                                studentName: student.full_name,
                                sports: student.sports,
                              })}
                              className="h-7 gap-1.5 rounded-lg bg-indigo-600 px-2.5 text-xs text-white hover:bg-indigo-500"
                            >
                              <Award className="h-3.5 w-3.5" />
                              Graduar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de seleção de esporte ──────────────────────────────── */}
      {sportSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setSportSelectModal(null)}
          />
          <div className="relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900">
              Selecione o esporte para graduar
            </h2>
            <p className="text-sm text-zinc-500">{sportSelectModal.studentName}</p>
            <div className="space-y-2">
              {sportSelectModal.sports
                .filter(s => s.sport !== 'boxe')
                .map(s => (
                  <button
                    key={s.sport}
                    type="button"
                    onClick={() => {
                      const grouped: GroupedStudent = {
                        id: sportSelectModal.studentId,
                        full_name: sportSelectModal.studentName,
                        sports: sportSelectModal.sports,
                      }
                      setGraduationTarget(toGraduationRow(grouped, s))
                      setSportSelectModal(null)
                    }}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <p className="text-sm font-medium text-zinc-900">
                      {SPORT_LABELS[s.sport] ?? s.sport}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Faixa atual: {BELT_LABELS[s.belt.toLowerCase()] ?? s.belt ?? '—'}
                    </p>
                  </button>
                ))}
            </div>
            <button
              type="button"
              onClick={() => setSportSelectModal(null)}
              className="w-full text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Modal de seleção de esporte (histórico) ─────────────────── */}
      {historySportSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setHistorySportSelect(null)}
          />
          <div className="relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-zinc-900">
              Selecione o esporte do histórico
            </h2>
            <p className="text-sm text-zinc-500">{historySportSelect.studentName}</p>
            <div className="space-y-2">
              {historySportSelect.sports.map(s => (
                <button
                  key={s.sport}
                  type="button"
                  onClick={() => {
                    const { studentId } = historySportSelect
                    setHistorySportSelect(null)
                    void openHistory(studentId, s.sport)
                  }}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {SPORT_LABELS[s.sport] ?? s.sport}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {s.sport === 'boxe'
                      ? 'Sem graduação'
                      : `Faixa atual: ${BELT_LABELS[s.belt.toLowerCase()] ?? s.belt ?? '—'}`}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHistorySportSelect(null)}
              className="w-full text-sm text-zinc-500 hover:text-zinc-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {graduationTarget && (
        <AutoOpenGraduationModal
          student={graduationTarget}
          onDone={clearGraduationTarget}
        />
      )}

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
                  {currentStudentRow?.sport === 'boxe' ? (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                      Sem graduação
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      beltColors[(currentStudentRow?.belt ?? studentDetail.belt).toLowerCase()] ?? 'bg-gray-200 text-gray-700'
                    }`}>
                      {BELT_LABELS[(currentStudentRow?.belt ?? studentDetail.belt).toLowerCase()] ?? (currentStudentRow?.belt ?? studentDetail.belt)}
                      {currentStudentRow?.sport === 'jiu-jitsu' && (currentStudentRow?.degree ?? studentDetail.degree) > 0 && (
                        <span className="tracking-tighter opacity-60">{'●'.repeat(currentStudentRow?.degree ?? studentDetail.degree)}</span>
                      )}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {currentStudentRow?.sport === 'muay-thai' ? 'prajied atual' :
                     currentStudentRow?.sport === 'boxe' ? 'boxe' : 'faixa atual'}
                  </span>
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
                    {currentStudentRow.sport === 'boxe'
                      ? 'Sem graduação'
                      : (
                        <>
                          {BELT_LABELS[currentStudentRow.belt.toLowerCase()] ?? currentStudentRow.belt}
                          {currentStudentRow.sport === 'jiu-jitsu' && currentStudentRow.degree > 0
                            ? ` — ${currentStudentRow.degree}º grau`
                            : ''}
                        </>
                      )}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {currentStudentRow.sport === 'boxe'
                      ? 'Boxe não possui graduação'
                      : `${currentStudentRow.trainings_since_belt} treino${currentStudentRow.trainings_since_belt !== 1 ? 's' : ''} desde a última graduação`}
                  </span>
                  {currentStudentRow.sport !== 'boxe' && (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      currentStudentRow.attendance_rate != null
                        ? attendanceColor(currentStudentRow.attendance_rate)
                        : 'text-gray-400 bg-gray-50 border-gray-200'
                    }`}>
                      {currentStudentRow.attendance_rate != null ? `${currentStudentRow.attendance_rate.toFixed(1)}%` : '—'} de frequência
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  {(() => {
                    const displaySport = currentStudentRow?.sport ?? studentDetail.sport ?? historySport
                    const displayBelt = currentStudentRow?.belt || studentDetail.belt
                    const displayDegree = currentStudentRow?.degree ?? studentDetail.degree

                    if (displaySport === 'boxe') {
                      return (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                          Sem graduação
                        </span>
                      )
                    }

                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                        beltColors[displayBelt.toLowerCase()] ?? 'bg-gray-100 text-gray-700'
                      }`}>
                        {BELT_LABELS[displayBelt.toLowerCase()] ?? displayBelt}
                        {displaySport === 'jiu-jitsu' && displayDegree > 0 && (
                          <span className="tracking-tighter opacity-60">{'●'.repeat(displayDegree)}</span>
                        )}
                      </span>
                    )
                  })()}
                  <p className="text-sm text-gray-500">
                    {(currentStudentRow?.sport ?? studentDetail.sport ?? historySport) === 'boxe'
                      ? 'Boxe não possui histórico de graduação.'
                      : 'Nenhuma promoção registrada ainda.'}
                  </p>
                  {(currentStudentRow?.sport ?? studentDetail.sport ?? historySport) !== 'boxe' && (
                    <p className="text-xs text-gray-400">
                      {studentDetail.full_name.split(' ')[0]} está nessa faixa desde que entrou na academia
                      {currentStudentRow
                        ? ` · ${currentStudentRow.trainings_since_belt} treino${currentStudentRow.trainings_since_belt !== 1 ? 's' : ''} no total`
                        : ''
                      }.
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gray-100" />

                  <div className="space-y-4">
                    {/* Início na academia — primeiro na timeline ASC */}
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

                    {history.map((item, idx) => {
                      const beltKey  = item.belt.toLowerCase()
                      const dotColor = beltDotColors[beltKey] ?? 'bg-gray-400'
                      const badgeColor = beltColors[beltKey] ?? 'bg-gray-200 text-gray-700'
                      const isLatest = idx === history.length - 1
                      const itemSport = item.sport ?? historySport

                      const periodEnd = isLatest ? undefined : history[idx + 1].graded_at
                      const duration  = formatDuration(item.graded_at, periodEnd)

                      const trainingsInPeriod = item.trainings_in_period

                      return (
                        <div key={item.id} className="relative flex gap-4">
                          <div className={`relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 border-white ${dotColor} ${
                            isLatest ? 'ring-2 ring-indigo-400/50' : ''
                          }`} />

                          <div className={`flex-1 rounded-xl border p-4 space-y-2 ${
                            isLatest
                              ? 'border-indigo-200 bg-indigo-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
                                {BELT_LABELS[item.belt.toLowerCase()] ?? item.belt}
                                {itemSport === 'jiu-jitsu' && item.degree > 0 && (
                                  <span className="tracking-tighter opacity-60">{'●'.repeat(item.degree)}</span>
                                )}
                              </span>
                              {isLatest && (
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

                            {itemSport === 'jiu-jitsu' && item.degree > 0 && (
                              <p className="text-xs text-gray-500">{item.degree}º grau</p>
                            )}

                            <div className="flex items-center gap-1 flex-wrap text-xs text-gray-400">
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{isLatest ? `há ${duration}` : duration} nessa faixa</span>
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
