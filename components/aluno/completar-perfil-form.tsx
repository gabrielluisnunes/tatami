'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, Loader2, Camera,
  SunMedium, EyeOff, User
} from 'lucide-react'
import { LiveCameraCapture } from '@/components/aluno/live-camera-capture'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

type FormStep = 'payment-day' | 'instructions' | 'camera' | 'saving' | 'saved'

interface CompletarPerfilFormProps {
  firstName: string
  hasFaceDescriptor?: boolean
}

const INSTRUCTIONS = [
  { icon: User,       text: 'Fundo branco ou claro atrás de você' },
  { icon: EyeOff,     text: 'Sem óculos nem brincos' },
  { icon: User,       text: 'Cabelo preso (se aplicável)' },
  { icon: SunMedium,  text: 'Ambiente bem iluminado, rosto centralizado' },
  { icon: Camera,     text: 'Use apenas a câmera — upload de arquivo não é permitido' },
]

export function CompletarPerfilForm({ firstName, hasFaceDescriptor = false }: CompletarPerfilFormProps) {
  const router = useRouter()

  const [step, setStep] = useState<FormStep>('payment-day')
  const [paymentDay, setPaymentDay] = useState<number | null>(null)
  const [capturedB64, setCapturedB64] = useState<string | null>(null)
  const [descriptor, setDescriptor] = useState<number[] | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSavingPayment, setIsSavingPayment] = useState(false)

  const handleCapture = (base64: string, desc: number[]) => {
    setCapturedB64(base64)
    setDescriptor(desc)
  }

  const handleSavePaymentDayOnly = async () => {
    if (paymentDay === null) return
    setIsSavingPayment(true)
    setSaveError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ payment_due_day: paymentDay })
        .eq('id', user.id)

      if (dbError) throw dbError

      router.push('/aluno/frequencia')
      router.refresh()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar o dia de pagamento.')
      setIsSavingPayment(false)
    }
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
          payment_due_day: paymentDay,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao salvar foto')
      }

      // Salva payment_due_day via Supabase client após o sucesso do upload
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user && paymentDay !== null) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ payment_due_day: paymentDay })
          .eq('id', user.id)
        if (dbError) throw dbError
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

  if (step === 'payment-day') {
    return (
      <div className="space-y-6 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Escolha seu dia de pagamento</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Selecione o dia do mês em que sua mensalidade irá vencer.
            Essa escolha é definitiva e não poderá ser alterada depois.
          </p>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
            <button
              key={day}
              type="button"
              onClick={() => setPaymentDay(day)}
              className={`aspect-square w-full rounded-xl font-semibold text-sm transition-colors ${
                paymentDay === day
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {saveError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-medium text-red-800">{saveError}</p>
          </div>
        )}

        <Button
          type="button"
          disabled={paymentDay === null || isSavingPayment}
          onClick={hasFaceDescriptor ? handleSavePaymentDayOnly : () => setStep('instructions')}
          className="w-full rounded-2xl bg-indigo-600 py-6 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {isSavingPayment ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </span>
          ) : (
            'Confirmar e continuar'
          )}
        </Button>
      </div>
    )
  }

  if (step === 'saved') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
          <CheckCircle className="h-10 w-10 text-emerald-600" />
        </div>
        <div>
          <p className="text-xl font-semibold text-zinc-900">Foto cadastrada!</p>
          <p className="mt-1 text-sm text-zinc-500">Redirecionando para o portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-4">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Olá, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Para usar o check-in por reconhecimento facial, precisamos cadastrar sua foto.
          Isso é feito uma única vez.
        </p>
      </div>

      {/* Card de instruções */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="mb-3 text-sm font-semibold text-amber-800">
          Antes de tirar a foto
        </p>
        <ul className="space-y-2.5">
          {INSTRUCTIONS.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <Icon className="h-4 w-4 text-amber-600" />
              </span>
              <span className="text-sm text-amber-800">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Câmera (renderizada apenas após aceitar instruções) */}
      {step === 'instructions' ? (
        <Button
          type="button"
          onClick={() => setStep('camera')}
          className="w-full rounded-2xl bg-indigo-600 py-6 font-semibold text-white hover:bg-indigo-500"
        >
          <Camera className="mr-2 h-5 w-5" />
          Entendi, abrir câmera
        </Button>
      ) : (
        <>
          <LiveCameraCapture onCapture={handleCapture} />

          {/* Erro de salvamento */}
          {saveError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-medium text-red-800">{saveError}</p>
            </div>
          )}

          {/* Botão salvar (aparece apenas quando rosto foi detectado com sucesso) */}
          {descriptor && (
            <Button
              type="button"
              onClick={handleSave}
              disabled={step === 'saving'}
              className="w-full rounded-2xl bg-emerald-600 py-6 font-semibold text-white hover:bg-emerald-500 disabled:opacity-70"
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
