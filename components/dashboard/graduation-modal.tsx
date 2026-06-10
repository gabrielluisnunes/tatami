'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Award, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const BELTS = [
  { value: 'branca', label: 'Branca' },
  { value: 'azul',   label: 'Azul'   },
  { value: 'roxa',   label: 'Roxa'   },
  { value: 'marrom', label: 'Marrom' },
  { value: 'preta',  label: 'Preta'  },
]

interface StudentRow {
  id: string
  full_name: string
  belt: string
  trainings_since_belt: number
}

interface GraduationModalProps {
  students: StudentRow[]
}

export function GraduationModal({ students }: GraduationModalProps) {
  const router = useRouter()
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)
  const [belt, setBelt] = useState('azul')
  const [notes, setNotes] = useState('')
  const [trainings, setTrainings] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openModal = (student: StudentRow) => {
    setSelectedStudent(student)
    setTrainings(student.trainings_since_belt)
    // Sugere próxima faixa automaticamente
    const idx = BELTS.findIndex(b => b.value === student.belt)
    setBelt(BELTS[Math.min(idx + 1, BELTS.length - 1)].value)
    setNotes('')
    setError(null)
  }

  const closeModal = () => {
    setSelectedStudent(null)
    setError(null)
  }

  const handleConfirm = async () => {
    if (!selectedStudent) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/graduations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          belt,
          notes: notes || undefined,
          trainings_at_graduation: trainings,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao registrar graduação')
      }
      closeModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar graduação')
    } finally {
      setLoading(false)
    }
  }

  const beltColors: Record<string, string> = {
    branca: 'bg-zinc-200 text-zinc-900',
    azul:   'bg-blue-600 text-white',
    roxa:   'bg-purple-700 text-white',
    marrom: 'bg-amber-800 text-white',
    preta:  'bg-zinc-950 text-white border border-zinc-600',
  }

  return (
    <>
      {/* Tabela de alunos */}
      <div className="overflow-hidden rounded-xl border border-zinc-800/80">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Aluno</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Faixa atual</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Treinos</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-400"></th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="border-b border-zinc-800/40 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-200">{student.full_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    beltColors[student.belt] ?? 'bg-zinc-700 text-zinc-200'
                  }`}>
                    {student.belt.charAt(0).toUpperCase() + student.belt.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {student.trainings_since_belt} treino{student.trainings_since_belt !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    onClick={() => openModal(student)}
                    className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 text-xs h-7 px-3 gap-1"
                  >
                    <Award className="h-3 w-3" />
                    Graduar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Registrar Graduação</h2>
                <p className="text-sm text-zinc-500">{selectedStudent.full_name}</p>
              </div>
              <button type="button" onClick={closeModal} className="text-zinc-500 hover:text-zinc-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nova faixa */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-400">Nova faixa</Label>
                <select
                  value={belt}
                  onChange={e => setBelt(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {BELTS.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Treinos acumulados */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-400">
                  Treinos acumulados <span className="font-normal text-zinc-600">(auto-preenchido)</span>
                </Label>
                <input
                  type="number"
                  min={0}
                  value={trainings}
                  onChange={e => setTrainings(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-400">
                  Observações <span className="font-normal text-zinc-600">(opcional)</span>
                </Label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: Excelente evolução técnica..."
                  className="w-full rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : 'Confirmar graduação'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
