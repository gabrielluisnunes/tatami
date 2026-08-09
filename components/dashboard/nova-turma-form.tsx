'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Professor {
  id: string
  full_name: string
}

interface NovaTurmaFormProps {
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

export function NovaTurmaForm({ professors }: NovaTurmaFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sport, setSport] = useState<string>('')
  const [name, setName] = useState('')
  const [professorId, setProfessorId] = useState(professors[0]?.id ?? '')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('20:30')

  const toggleWeekday = (day: number) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sport) return
    if (weekdays.length === 0) {
      setError('Selecione ao menos um dia da semana.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sport,
          professor_id: professorId,
          weekdays,
          start_time: startTime,
          end_time: endTime,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao criar turma')
      }
      setOpen(false)
      setName('')
      setSport('')
      setWeekdays([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar turma')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'rounded-xl border-zinc-200 bg-white py-5 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-indigo-500'
  const labelClass = 'text-xs font-semibold text-zinc-500'
  const selectClass =
    'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 rounded-xl shadow-sm"
      >
        <Plus className="h-4 w-4" />
        Nova turma
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => !loading && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Nova turma</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Esporte */}
              <div className="space-y-1.5">
                <Label className={labelClass}>Esporte</Label>
                <select
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  required
                  disabled={loading}
                  className={selectClass}
                >
                  <option value="" disabled>
                    Selecione o esporte
                  </option>
                  <option value="jiu-jitsu">Jiu-Jitsu</option>
                  <option value="muay-thai">Muay Thai</option>
                  <option value="boxe">Boxe</option>
                </select>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <Label className={labelClass}>Nome da turma</Label>
                <Input
                  type="text"
                  placeholder="Ex: BJJ Adulto — Noturno"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>

              {/* Professor */}
              <div className="space-y-1.5">
                <Label className={labelClass}>Professor responsável</Label>
                <select
                  value={professorId}
                  onChange={e => setProfessorId(e.target.value)}
                  disabled={loading}
                  required
                  className={selectClass}
                >
                  {professors.length === 0 && (
                    <option value="" disabled>
                      Nenhum professor cadastrado
                    </option>
                  )}
                  {professors.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
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
                      onClick={() => toggleWeekday(day.value)}
                      disabled={loading}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        weekdays.includes(day.value)
                          ? 'bg-indigo-600 text-white'
                          : 'border border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horários — grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className={labelClass}>Início</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    onClick={e => e.currentTarget.showPicker?.()}
                    style={{ colorScheme: 'light' }}
                    required
                    disabled={loading}
                    className={`${inputClass} cursor-pointer`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={labelClass}>Fim</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    onClick={e => e.currentTarget.showPicker?.()}
                    style={{ colorScheme: 'light' }}
                    required
                    disabled={loading}
                    className={`${inputClass} cursor-pointer`}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="flex-1 rounded-xl border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !name || !sport || !professorId || weekdays.length === 0}
                  className="flex-1 rounded-xl bg-indigo-600 font-semibold text-white hover:bg-indigo-500"
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : 'Criar turma'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
