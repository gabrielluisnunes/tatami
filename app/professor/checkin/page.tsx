'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, ChevronRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaceApi } from '@/hooks/use-face-api'
import { GroupPhotoUpload } from '@/components/group-photo-upload'
import { AttendanceReview, type StudentMatch } from '@/components/attendance-review'
import { createClient } from '@/lib/supabase/client'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ClassOption {
  id: string
  name: string
  start_time: string
  end_time: string
}

type Step = 'select-class' | 'upload-photo' | 'processing' | 'review' | 'success'

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProfessorCheckinPage() {
  const faceApiStatus = useFaceApi()

  const [userRole, setUserRole] = useState<string | null>(null)
  const isAdmin = userRole === 'admin'

  const [step, setStep] = useState<Step>('select-class')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<StudentMatch[]>([])
  const [processingMsg, setProcessingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [totalPresent, setTotalPresent] = useState(0)

  // Busca perfil/role do usuário logado
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role) setUserRole(data.role)
        })
    })
  }, [])

  // Carrega turmas ao montar
  useEffect(() => {
    fetch('/api/classes')
      .then(r => r.json())
      .then(d => setClasses(d.classes ?? []))
      .catch(() => setError('Erro ao carregar turmas.'))
      .finally(() => setLoadingClasses(false))
  }, [])

  // Etapa 2 → 3: foto selecionada, inicia processamento
  const handlePhotoSelected = useCallback(async (base64: string) => {
    if (!selectedClass) return
    setError(null)
    setStep('processing')
    setProcessingMsg('Salvando foto...')

    try {
      // 1. Upload da foto + criação do checkin no servidor
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClass.id, photo_base64: base64 }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao salvar check-in')
      }
      const { checkin_id } = await res.json()
      setCheckinId(checkin_id)

      // 2. Detecção de rostos na imagem (browser)
      setProcessingMsg('Detectando rostos...')
      const faceapi = await import('@vladmandic/face-api')

      const img = new Image()
      img.src = base64
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      })

      const detections = await faceapi
        .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptors()

      if (!detections.length) {
        setConfirmed([])
        setStep('review')
        return
      }

      // 3. Comparação biométrica no servidor (LGPD compliance)
      setProcessingMsg('Identificando alunos...')
      const detectedDescriptors = detections.map(d => Array.from(d.descriptor))

      const matchRes = await fetch('/api/checkin/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detected_descriptors: detectedDescriptors }),
      })

      if (!matchRes.ok) {
        const d = await matchRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao identificar alunos')
      }

      const { matches } = await matchRes.json()
      setConfirmed(matches)
      setStep('review')
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Erro ao processar check-in')
      setStep('upload-photo')
    }
  }, [selectedClass])

  const handleRemove = useCallback((studentId: string) => {
    setConfirmed(prev => prev.filter(s => s.student_id !== studentId))
  }, [])

  const handleAdd = useCallback((student: StudentMatch) => {
    setConfirmed(prev => [...prev, student])
  }, [])

  const handleConfirm = async () => {
    if (!checkinId || confirmed.length === 0) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/checkin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkin_id: checkinId,
          students: confirmed.map(({ student_id, source, similarity }) => ({
            student_id,
            source,
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
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep('select-class')
    setSelectedClass(null)
    setCheckinId(null)
    setConfirmed([])
    setError(null)
  }

  const backToDashboardButton = isAdmin ? (
    <Link
      href="/dashboard"
      className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao painel
    </Link>
  ) : null

  // ─── Renderização por etapa ────────────────────────────────────────────────

  // Etapa 1: Seleção de turma
  if (step === 'select-class') {
    return (
      <div className="space-y-6">
        {backToDashboardButton}
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Check-in</h1>
          <p className="text-sm text-zinc-500 mt-1">Selecione a turma para registrar presenças.</p>
        </div>

        {faceApiStatus === 'loading' && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-800/30 bg-indigo-950/30 px-4 py-3">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span className="text-xs text-indigo-400">Carregando modelos de reconhecimento facial...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        {loadingClasses ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 py-12 text-center text-zinc-600">
            <p className="text-sm">Nenhuma turma encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {classes.map(cls => (
              <button
                key={cls.id}
                type="button"
                onClick={() => { setSelectedClass(cls); setStep('upload-photo') }}
                className="flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 text-left transition-colors hover:border-indigo-600/50 hover:bg-zinc-800/60"
              >
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{cls.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{cls.start_time} – {cls.end_time}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Etapa 2: Upload da foto de grupo
  if (step === 'upload-photo') {
    return (
      <div className="space-y-6">
        {backToDashboardButton}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('select-class')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{selectedClass?.name}</h1>
            <p className="text-sm text-zinc-500">{selectedClass?.start_time} – {selectedClass?.end_time}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4">
          <p className="text-sm font-medium text-zinc-300">
            Tire uma foto da turma ou selecione da galeria.
            Quanto mais rostos visíveis, melhor o reconhecimento.
          </p>
          <GroupPhotoUpload
            onSelect={handlePhotoSelected}
            onClear={() => {}}
          />
        </div>
      </div>
    )
  }

  // Etapa 3: Processando
  if (step === 'processing') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        {backToDashboardButton}
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/10 ring-1 ring-indigo-500/20">
            <Loader2 className="h-9 w-9 animate-spin text-indigo-500" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Processando</h2>
          <p className="text-sm text-zinc-500 mt-1">{processingMsg}</p>
        </div>
        <p className="text-xs text-zinc-700 max-w-[240px]">
          Reconhecimento seguro: a comparação biométrica é realizada de forma protegida no servidor.
        </p>
      </div>
    )
  }

  // Etapa 4: Revisão de presenças
  if (step === 'review') {
    return (
      <div className="space-y-5">
        {backToDashboardButton}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setStep('upload-photo')}
            disabled={submitting}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Revisar Presenças</h1>
            <p className="text-sm text-zinc-500">{confirmed.length} aluno{confirmed.length !== 1 ? 's' : ''} identificado{confirmed.length !== 1 ? 's' : ''}</p>
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

  // Etapa 5: Sucesso
  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-100">Presenças confirmadas!</h2>
          <p className="text-zinc-500 mt-2 text-sm">
            {totalPresent} aluno{totalPresent !== 1 ? 's' : ''} registrado{totalPresent !== 1 ? 's' : ''} em <span className="text-zinc-300 font-medium">{selectedClass?.name}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={handleReset}
            className="rounded-2xl bg-indigo-600 px-8 py-5 font-semibold text-white hover:bg-indigo-500"
          >
            Novo check-in
          </Button>
          {isAdmin && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Voltar ao painel
            </Link>
          )}
        </div>
      </div>
    )
  }

  return null
}
