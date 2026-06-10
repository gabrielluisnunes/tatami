'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, Loader2, Camera,
  SunMedium, EyeOff, User
} from 'lucide-react'
import { LiveCameraCapture } from '@/components/aluno/live-camera-capture'
import { Button } from '@/components/ui/button'

type FormStep = 'instructions' | 'camera' | 'saving' | 'saved'

interface CompletarPerfilFormProps {
  firstName: string
}

const INSTRUCTIONS = [
  { icon: User,       text: 'Fundo branco ou claro atrás de você' },
  { icon: EyeOff,     text: 'Sem óculos nem brincos' },
  { icon: User,       text: 'Cabelo preso (se aplicável)' },
  { icon: SunMedium,  text: 'Ambiente bem iluminado, rosto centralizado' },
  { icon: Camera,     text: 'Use apenas a câmera — upload de arquivo não é permitido' },
]

export function CompletarPerfilForm({ firstName }: CompletarPerfilFormProps) {
  const router = useRouter()

  const [step, setStep] = useState<FormStep>('instructions')
  const [capturedB64, setCapturedB64] = useState<string | null>(null)
  const [descriptor, setDescriptor] = useState<number[] | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleCapture = (base64: string, desc: number[]) => {
    setCapturedB64(base64)
    setDescriptor(desc)
  }

  const handleSave = async () => {
    if (!capturedB64 || !descriptor) return

    setStep('saving')
    setSaveError(null)

    try {
      const res = await fetch('/api/students/profile/photo', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          photo_base64:    capturedB64,
          face_descriptor: descriptor,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao salvar foto')
      }

      setStep('saved')
      // Aguarda 1.5s para o aluno ver a confirmação antes de redirecionar
      setTimeout(() => {
        router.push('/aluno/frequencia')
        router.refresh()
      }, 1500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
      setStep('camera')
    }
  }

  if (step === 'saved') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-zinc-100">Foto cadastrada!</p>
          <p className="mt-1 text-sm text-zinc-500">Redirecionando para o portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Olá, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Para usar o check-in por reconhecimento facial, precisamos cadastrar sua foto.
          Isso é feito uma única vez.
        </p>
      </div>

      {/* Card de instruções */}
      <div className="rounded-2xl border border-amber-800/30 bg-amber-950/20 p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">
          Antes de tirar a foto
        </p>
        <ul className="space-y-2.5">
          {INSTRUCTIONS.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className="h-4 w-4 text-amber-400" />
              </span>
              <span className="text-sm text-amber-200/80">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Câmera (renderizada apenas após aceitar instruções) */}
      {step === 'instructions' ? (
        <Button
          type="button"
          onClick={() => setStep('camera')}
          className="w-full rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
        >
          <Camera className="mr-2 h-5 w-5" />
          Entendi, abrir câmera
        </Button>
      ) : (
        <>
          <LiveCameraCapture onCapture={handleCapture} />

          {/* Erro de salvamento */}
          {saveError && (
            <div className="rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
              <p className="text-xs font-medium text-red-400">{saveError}</p>
            </div>
          )}

          {/* Botão salvar (aparece apenas quando rosto foi detectado com sucesso) */}
          {descriptor && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={step === 'saving'}
              className="w-full rounded-xl bg-emerald-600 py-6 font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 disabled:opacity-70"
            >
              {step === 'saving' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Salvar foto e continuar
                </>
              )}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
