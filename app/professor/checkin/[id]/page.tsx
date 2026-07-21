'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AttendanceReview, type StudentMatch } from '@/components/attendance-review'

export default function ReabrirCheckinPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const checkinId = params.id

  type Step = 'loading' | 'review' | 'submitting' | 'success' | 'error'
  const [step, setStep] = useState<Step>('loading')
  const [confirmed, setConfirmed] = useState<StudentMatch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [totalPresent, setTotalPresent] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const attendanceRes = await fetch(`/api/checkin/${checkinId}/attendance`)
        if (!attendanceRes.ok) throw new Error('Erro ao carregar presenças')

        const { students: already } = await attendanceRes.json()

        setConfirmed(already)
        setStep('review')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar check-in')
        setStep('error')
      }
    }

    load()
  }, [checkinId])

  const handleRemove = useCallback((studentId: string) => {
    setConfirmed(prev => prev.filter(s => s.student_id !== studentId))
  }, [])

  const handleAdd = useCallback((student: StudentMatch) => {
    setConfirmed(prev => {
      if (prev.some(s => s.student_id === student.student_id)) return prev
      return [...prev, student]
    })
  }, [])

  const handleConfirm = async () => {
    if (confirmed.length === 0) return
    setStep('submitting')
    setError(null)

    try {
      const res = await fetch('/api/checkin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: checkinId,
          students: confirmed.map(({ student_id, source, similarity }) => ({
            student_id,
            source: source ?? 'manual',
            similarity,
          })),
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao confirmar')
      }

      setTotalPresent(confirmed.length)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar presenças')
      setStep('review')
    }
  }

  // Loading
  if (step === 'loading') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm text-zinc-500">Carregando check-in...</p>
      </div>
    )
  }

  // Error fatal
  if (step === 'error') {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => router.push('/professor/frequencia')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      </div>
    )
  }

  // Success
  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Presenças confirmadas!</h2>
          <p className="text-zinc-500 mt-2 text-sm">
            {totalPresent} aluno{totalPresent !== 1 ? 's' : ''} registrado{totalPresent !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button
          onClick={() => router.push('/professor/frequencia')}
          className="rounded-2xl bg-indigo-600 px-8 py-5 font-semibold text-white hover:bg-indigo-500"
        >
          Voltar à frequência
        </Button>
      </div>
    )
  }

  // Review (step === 'review' | 'submitting')
  const submitting = step === 'submitting'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/professor/frequencia')}
          disabled={submitting}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Revisar Presenças</h1>
          <p className="text-sm text-zinc-500">
            {confirmed.length} aluno{confirmed.length !== 1 ? 's' : ''} na lista
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      <AttendanceReview
        confirmed={confirmed}
        onRemove={handleRemove}
        onAdd={handleAdd}
      />

      <div className="pt-2 space-y-3">
        <Button
          onClick={handleConfirm}
          disabled={submitting || confirmed.length === 0}
          className="w-full rounded-2xl bg-indigo-600 py-6 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Confirmando...
            </span>
          ) : (
            `Confirmar ${confirmed.length} presença${confirmed.length !== 1 ? 's' : ''}`
          )}
        </Button>
        {confirmed.length === 0 && (
          <p className="text-center text-xs text-zinc-600">
            Adicione ao menos um aluno para confirmar.
          </p>
        )}
      </div>
    </div>
  )
}
