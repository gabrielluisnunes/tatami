'use client'

import { useState, useMemo } from 'react'
import { X, UserPlus, Search, Check, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface StudentMatch {
  student_id: string
  full_name: string
  photo_url?: string | null
  source: 'ai' | 'manual'
  similarity?: number // 0-1, quanto menor melhor (distância euclidiana normalizada)
}

export interface StudentDescriptor {
  id: string
  full_name: string
  photo_url?: string | null
  face_descriptor: number[]
}

interface AttendanceReviewProps {
  confirmed: StudentMatch[]
  allStudents: StudentDescriptor[]
  onRemove: (studentId: string) => void
  onAdd: (student: StudentMatch) => void
}

function SimilarityBadge({ similarity }: { similarity?: number }) {
  if (similarity === undefined) return null
  // Converte distância euclidiana para % de confiança (distância 0 = 100%, distância 0.6 = 0%)
  const pct = Math.round(Math.max(0, (1 - similarity / 0.6)) * 100)
  const color = pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : pct >= 60 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              : 'text-red-400 bg-red-500/10 border-red-500/20'
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
      <img src={photoUrl} alt={name} className="h-10 w-10 rounded-full object-cover border border-zinc-700 flex-shrink-0" />
    )
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-sm font-bold text-zinc-400">
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

export function AttendanceReview({ confirmed, allStudents, onRemove, onAdd }: AttendanceReviewProps) {
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const confirmedIds = useMemo(() => new Set(confirmed.map(s => s.student_id)), [confirmed])

  const searchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return allStudents
      .filter(s => !confirmedIds.has(s.id) && s.full_name.toLowerCase().includes(q))
      .slice(0, 6)
  }, [search, allStudents, confirmedIds])

  const handleAdd = (student: StudentDescriptor) => {
    onAdd({
      student_id: student.id,
      full_name: student.full_name,
      photo_url: student.photo_url,
      source: 'manual',
    })
    setSearch('')
  }

  return (
    <div className="space-y-4">
      {/* Lista de confirmados */}
      <div className="space-y-2">
        {confirmed.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-10 text-zinc-600">
            <Users className="h-8 w-8 mb-2" />
            <p className="text-sm">Nenhum aluno identificado.</p>
            <p className="text-xs mt-1">Adicione manualmente abaixo.</p>
          </div>
        ) : (
          confirmed.map((student) => (
            <div
              key={student.student_id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
            >
              <StudentAvatar name={student.full_name} photoUrl={student.photo_url} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{student.full_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {student.source === 'ai' ? (
                    <>
                      <span className="text-[10px] text-zinc-500">Reconhecido</span>
                      <SimilarityBadge similarity={student.similarity} />
                    </>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Adicionado manualmente</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(student.student_id)}
                className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-zinc-600 hover:bg-red-900/30 hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Botão + busca manual */}
      {!showSearch ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSearch(true)}
          className="w-full rounded-xl border-zinc-800 bg-zinc-900/40 py-5 text-zinc-400 hover:bg-zinc-800 hover:text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar aluno manualmente
        </Button>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400">Buscar aluno</p>
            <button
              type="button"
              onClick={() => { setShowSearch(false); setSearch('') }}
              className="text-zinc-600 hover:text-zinc-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nome do aluno..."
              className="pl-9 rounded-xl border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map(student => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleAdd(student)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-zinc-800"
                >
                  <StudentAvatar name={student.full_name} photoUrl={student.photo_url} />
                  <span className="text-sm text-zinc-200">{student.full_name}</span>
                  <Check className="ml-auto h-4 w-4 text-zinc-600" />
                </button>
              ))}
            </div>
          )}
          {search.trim() && searchResults.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-2">Nenhum aluno encontrado.</p>
          )}
        </div>
      )}
    </div>
  )
}
