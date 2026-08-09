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

const MT_BELTS = [
  { value: 'branco',    label: 'Branco'   },
  { value: 'laranja',   label: 'Laranja'  },
  { value: 'azul-mt',   label: 'Azul'     },
  { value: 'vermelho',  label: 'Vermelho' },
  { value: 'amarelo',   label: 'Amarelo'  },
  { value: 'verde',     label: 'Verde'    },
  { value: 'marrom-mt', label: 'Marrom'   },
  { value: 'preto-mt',  label: 'Preto'    },
]

const beltBadgeColors: Record<string, string> = {
  branca:      'bg-zinc-100 text-zinc-800 border border-zinc-300',
  azul:        'bg-blue-100 text-blue-800 border border-blue-200',
  roxa:        'bg-purple-100 text-purple-800 border border-purple-200',
  marrom:      'bg-amber-100 text-amber-900 border border-amber-300',
  preta:       'bg-zinc-900 text-white border border-zinc-800',
  branco:      'bg-zinc-100 text-zinc-800 border border-zinc-300',
  laranja:     'bg-orange-100 text-orange-800 border border-orange-200',
  'azul-mt':   'bg-blue-100 text-blue-800 border border-blue-200',
  vermelho:    'bg-red-100 text-red-800 border border-red-200',
  amarelo:     'bg-yellow-100 text-yellow-800 border border-yellow-200',
  verde:       'bg-green-100 text-green-800 border border-green-200',
  'marrom-mt': 'bg-amber-100 text-amber-900 border border-amber-300',
  'preto-mt':  'bg-zinc-900 text-white border border-zinc-800',
}

interface StudentRow {
  id: string
  full_name: string
  belt: string
  degree: number
  sport: string
  trainings_since_belt: number
}

interface GraduationModalProps {
  students: StudentRow[]
  inlineButton?: boolean
}

const inputCls = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'

function ModalContent({
  student,
  onClose,
}: {
  student: StudentRow
  onClose: () => void
}) {
  const router = useRouter()
  const beltList = student.sport === 'muay-thai' ? MT_BELTS : BELTS
  const idx = beltList.findIndex(b => b.value === student.belt)
  const nextBeltDefault = beltList[Math.min(idx + 1, beltList.length - 1)].value

  const [belt, setBelt]       = useState(nextBeltDefault)
  const [degree, setDegree]   = useState(() => {
    if (student.sport === 'jiu-jitsu' && nextBeltDefault === student.belt) {
      return Math.min((student.degree ?? 0) + 1, 4)
    }
    return 0
  })
  const [notes, setNotes]         = useState('')
  const [trainings, setTrainings] = useState(student.trainings_since_belt)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleBeltChange = (newBelt: string) => {
    setBelt(newBelt)
    if (student.sport === 'jiu-jitsu') {
      if (newBelt === student.belt) {
        setDegree(Math.min((student.degree ?? 0) + 1, 4))
      } else {
        setDegree(0)
      }
    } else {
      setDegree(0)
    }
  }

  const handleConfirm = async () => {
    if (belt === student.belt && degree <= (student.degree ?? 0)) {
      setError(`Para promoção de grau, o novo grau deve ser maior que o atual (${student.degree ?? 0}º grau)`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/graduations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id:              student.id,
          belt,
          degree: student.sport === 'jiu-jitsu' ? degree : 0,
          sport:                   student.sport,
          notes:                   notes || undefined,
          trainings_at_graduation: trainings,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao registrar graduação')
      }
      onClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar graduação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Registrar Graduação</h2>
            <p className="text-sm text-zinc-500 mt-0.5">{student.full_name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              {student.sport === 'muay-thai' ? 'Novo prajied' : 'Nova faixa'}
            </Label>
            <select value={belt} onChange={e => handleBeltChange(e.target.value)} className={inputCls}>
              {(student.sport === 'muay-thai' ? MT_BELTS : BELTS).map(b => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          {student.sport === 'jiu-jitsu' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">Grau</Label>
              <select value={degree} onChange={e => setDegree(Number(e.target.value))} className={inputCls}>
                <option value={0}>Sem grau</option>
                <option value={1}>1º grau</option>
                <option value={2}>2º grau</option>
                <option value={3}>3º grau</option>
                <option value={4}>4º grau</option>
              </select>
              {belt === student.belt && (
                <p className="text-[10px] text-zinc-400">
                  Grau atual: {student.degree > 0 ? `${student.degree}º grau` : 'sem grau'}.
                  {student.degree >= 4 ? ' Considere promover de faixa.' : ''}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Treinos acumulados{' '}
              <span className="font-normal text-zinc-400">(auto-preenchido)</span>
            </Label>
            <input
              type="number"
              min={0}
              value={trainings}
              onChange={e => setTrainings(Number(e.target.value))}
              className={inputCls}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Observações{' '}
              <span className="font-normal text-zinc-400">(opcional)</span>
            </Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Ex: Excelente evolução técnica..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Confirmar graduação'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function GraduationModal({ students, inlineButton = false }: GraduationModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)

  if (inlineButton && students.length > 0) {
    return (
      <>
        <Button
          size="sm"
          onClick={() => setSelectedStudent(students[0])}
          className="h-7 gap-1.5 rounded-lg bg-indigo-600 px-2.5 text-xs text-white hover:bg-indigo-500"
        >
          <Award className="h-3.5 w-3.5" />
          Graduar
        </Button>
        {selectedStudent && (
          <ModalContent student={selectedStudent} onClose={() => setSelectedStudent(null)} />
        )}
      </>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Aluno</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Faixa atual</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-500">Treinos</th>
              <th className="px-4 py-3 text-right font-medium text-zinc-500"></th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                <td className="px-4 py-3 font-medium text-zinc-900">{student.full_name}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    beltBadgeColors[student.belt] ?? 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                  }`}>
                    {student.belt.charAt(0).toUpperCase() + student.belt.slice(1)}
                    {student.degree > 0 && (
                      <span className="tracking-tighter opacity-60">{'●'.repeat(student.degree)}</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {student.trainings_since_belt} treino{student.trainings_since_belt !== 1 ? 's' : ''}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    onClick={() => setSelectedStudent(student)}
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

      {selectedStudent && (
        <ModalContent student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
    </>
  )
}
