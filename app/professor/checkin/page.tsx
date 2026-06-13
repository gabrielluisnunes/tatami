'use client'

import { useState, useCallback, useEffect } from 'react'
import { CheckCircle, ChevronRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFaceApi } from '@/hooks/use-face-api'
import { GroupPhotoUpload } from '@/components/group-photo-upload'
import { AttendanceReview, type StudentMatch, type StudentDescriptor } from '@/components/attendance-review'

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ClassOption {
  id: string
  name: string
  start_time: string
  end_time: string
}

type Step = 'select-class' | 'upload-photo' | 'processing' | 'review' | 'success'

// ─── Algoritmo de comparação (roda no browser) ────────────────────────────────

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

const MATCH_THRESHOLD = 0.6

async function matchFacesInPhoto(
  photoBase64: string,
  students: StudentDescriptor[]
): Promise<StudentMatch[]> {
  const faceapi = await import('@vladmandic/face-api')

  const img = new Image()
  img.src = photoBase64
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
  })

  // Detecta TODOS os rostos na foto de grupo
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
    .withFaceLandmarks()
    .withFaceDescriptors()

  if (!detections.length) return []

  const matches: StudentMatch[] = []
  const matchedStudentIds = new Set<string>()

  for (const detection of detections) {
    const detectedDescriptor = Array.from(detection.descriptor)

    let bestMatch: { student: StudentDescriptor; distance: number } | null = null

    for (const student of students) {
      if (matchedStudentIds.has(student.id)) continue // evita duplicatas

      const dist = euclideanDistance(detectedDescriptor, student.face_descriptor)
      if (dist < MATCH_THRESHOLD && (!bestMatch || dist < bestMatch.distance)) {
        bestMatch = { student, distance: dist }
      }
    }

    if (bestMatch) {
      matchedStudentIds.add(bestMatch.student.id)
      matches.push({
        student_id: bestMatch.student.id,
        full_name: bestMatch.student.full_name,
        photo_url: bestMatch.student.photo_url,
        source: 'ai',
        similarity: bestMatch.distance,
      })
    }
  }

  return matches
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProfessorCheckinPage() {
  const faceApiStatus = useFaceApi()

  const [step, setStep] = useState<Step>('select-class')
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null)
  const [checkinId, setCheckinId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<StudentMatch[]>([])
  const [allStudents, setAllStudents] = useState<StudentDescriptor[]>([])
  const [processingMsg, setProcessingMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [totalPresent, setTotalPresent] = useState(0)

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

      // 2. Busca descritores de todos os alunos da academia
      setProcessingMsg('Carregando alunos...')
      const studentsRes = await fetch('/api/students/descriptors')
      if (!studentsRes.ok) throw new Error('Erro ao carregar alunos')
      const { students } = await studentsRes.json()
      setAllStudents(students)

      if (!students.length) {
        // Nenhum aluno cadastrado com foto — vai direto para revisão vazia
        setConfirmed([])
        setStep('review')
        return
      }

      // 3. Detecção e comparação no browser
      setProcessingMsg('Identificando rostos...')
      const matches = await matchFacesInPhoto(base64, students)
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
    setAllStudents([])
    setError(null)
  }

  // ─── Renderização por etapa ────────────────────────────────────────────────

  // Etapa 1: Seleção de turma
  if (step === 'select-class') {
    return (
      <div className="space-y-6">
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
          O reconhecimento acontece no seu dispositivo, sem enviar dados biométricos para servidores externos.
        </p>
      </div>
    )
  }

  // Etapa 4: Revisão de presenças
  if (step === 'review') {
    return (
      <div className="space-y-5">
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
          allStudents={allStudents}
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
        <Button
          onClick={handleReset}
          className="rounded-2xl bg-indigo-600 px-8 py-5 font-semibold text-white hover:bg-indigo-500"
        >
          Novo check-in
        </Button>
      </div>
    )
  }

  return null
}
