'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, UserPlus, Search, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface StudentMatch {
  student_id: string
  full_name: string
  photo_url?: string | null
  source: 'ai' | 'manual'
  similarity?: number // 0-1, quanto menor melhor (distância euclidiana normalizada)
  /** false = reconhecido, mas não pratica o esporte da turma */
  eligible?: boolean
}

export interface StudentLookupItem {
  id: string
  full_name: string
  photo_url?: string | null
  eligible?: boolean
}

interface AttendanceReviewProps {
  confirmed: StudentMatch[]
  onRemove: (studentId: string) => void
  onAdd: (student: StudentMatch) => void
  /** Esporte da turma — filtra elegibilidade na busca manual */
  sport?: string | null
  sportLabel?: string
}

const DEFAULT_SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  'boxe': 'Boxe',
}

function SimilarityBadge({ similarity }: { similarity?: number }) {
  if (similarity === undefined) return null
  // Converte distância euclidiana para % de confiança (distância 0 = 100%, distância 0.6 = 0%)
  const pct = Math.round(Math.max(0, (1 - similarity / 0.6)) * 100)
  const color = pct >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : pct >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-red-700 bg-red-50 border-red-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {pct}%
    </span>
  )
}

function StudentAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-200 shrink-0"
      />
    )
  }
  return (
    <div className="h-10 w-10 rounded-full bg-zinc-100 ring-1 ring-zinc-200 shrink-0 flex items-center justify-center text-zinc-500 text-sm font-bold">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function isEligible(student: { eligible?: boolean }) {
  return student.eligible !== false
}

export function AttendanceReview({
  confirmed,
  onRemove,
  onAdd,
  sport,
  sportLabel,
}: AttendanceReviewProps) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [studentsList, setStudentsList] = useState<StudentLookupItem[]>([])

  const resolvedSportLabel = sportLabel
    ?? (sport ? DEFAULT_SPORT_LABELS[sport] ?? sport : undefined)

  useEffect(() => {
    const url = sport
      ? `/api/students/list?sport=${encodeURIComponent(sport)}`
      : '/api/students/list'

    fetch(url)
      .then(r => r.json())
      .then(d => setStudentsList(d.students ?? []))
      .catch(err => console.error('Erro ao carregar lista de alunos:', err))
  }, [sport])

  const confirmedIds = useMemo(() => new Set(confirmed.map(s => s.student_id)), [confirmed])
  const ineligibleCount = useMemo(
    () => confirmed.filter(s => !isEligible(s)).length,
    [confirmed]
  )

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return studentsList
      .filter(s =>
        !confirmedIds.has(s.id)
        && isEligible(s)
        && s.full_name.toLowerCase().includes(q)
      )
      .slice(0, 6)
  }, [search, studentsList, confirmedIds])

  const handleAdd = (student: StudentLookupItem) => {
    if (!isEligible(student)) return
    onAdd({
      student_id: student.id,
      full_name: student.full_name,
      photo_url: student.photo_url,
      source: 'manual',
      eligible: true,
    })
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {ineligibleCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs text-amber-800">
            {ineligibleCount} aluno{ineligibleCount !== 1 ? 's' : ''} reconhecido
            {ineligibleCount !== 1 ? 's' : ''} na foto, mas sem cadastro em{' '}
            <span className="font-semibold">{resolvedSportLabel ?? 'este esporte'}</span>.
            {' '}Não receberá{ineligibleCount !== 1 ? 'o' : ''} presença até o esporte ser adicionado no cadastro.
          </p>
        </div>
      )}

      {/* Lista de confirmados */}
      <div className="space-y-2">
        {confirmed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-10 text-zinc-500">
            <Users className="h-8 w-8 mb-2 text-zinc-400" />
            <p className="text-sm">Nenhum aluno identificado.</p>
            <p className="text-xs mt-1">Adicione manualmente abaixo.</p>
          </div>
        ) : (
          confirmed.map((student) => {
            const eligible = isEligible(student)
            return (
              <div
                key={student.student_id}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  eligible
                    ? 'border-zinc-200 bg-white'
                    : 'border-amber-200 bg-amber-50/40'
                }`}
              >
                <StudentAvatar name={student.full_name} photoUrl={student.photo_url} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${eligible ? 'text-zinc-900' : 'text-zinc-700'}`}>
                    {student.full_name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    {student.source === 'ai' ? (
                      <>
                        <span className="text-[10px] text-zinc-500">Reconhecido</span>
                        <SimilarityBadge similarity={student.similarity} />
                      </>
                    ) : (
                      <span className="text-[10px] text-zinc-500">Adicionado manualmente</span>
                    )}
                    {!eligible && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        Não pratica {resolvedSportLabel ?? 'este esporte'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(student.student_id)}
                  className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Botão + busca manual */}
      {!showSearch ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSearch(true)}
          className="w-full rounded-xl border border-zinc-200 bg-white py-5 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar aluno manualmente
        </Button>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-500">
              Buscar aluno{resolvedSportLabel ? ` (${resolvedSportLabel})` : ''}
            </p>
            <button
              type="button"
              onClick={() => { setShowSearch(false); setSearch('') }}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nome do aluno..."
              className="pl-9 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus-visible:ring-indigo-500"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleAdd(student)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-zinc-50"
                >
                  <StudentAvatar name={student.full_name} photoUrl={student.photo_url} />
                  <span className="text-sm text-zinc-800">{student.full_name}</span>
                  <Check className="ml-auto h-4 w-4 text-zinc-400" />
                </button>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-2">
              Nenhum aluno elegível encontrado
              {resolvedSportLabel ? ` para ${resolvedSportLabel}` : ''}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
