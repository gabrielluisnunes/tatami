'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Download, AlertCircle, Loader2, FileSignature, ChevronRight, ChevronLeft } from 'lucide-react'
import { SimpleCamera } from './simple-camera'

// ── Utilitários de CPF ──────────────────────────────────────────────────────

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function isValidCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(d[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(d[10])
}

// ── Tipos ───────────────────────────────────────────────────────────────────

interface Props {
  contractId: string
  title: string
  description?: string | null
  fileType: 'pdf' | 'docx'
  signedFileUrl: string
}

type Step = 'form' | 'signature' | 'photo'

interface FormData {
  signerFullName: string
  signerCpf:      string
  isMinor:        boolean
  guardianName:   string
  guardianCpf:    string
}

interface FormErrors {
  signerFullName?: string
  signerCpf?:      string
  guardianName?:   string
  guardianCpf?:    string
}

// ── Componente ──────────────────────────────────────────────────────────────

export function ContratoAssinaturaForm({
  contractId, title, description, fileType, signedFileUrl,
}: Props) {
  const router = useRouter()

  // Controle de etapa
  const [step, setStep] = useState<Step>('form')

  // Dados do formulário (etapa 0)
  const [formData, setFormData] = useState<FormData>({
    signerFullName: '',
    signerCpf:      '',
    isMinor:        false,
    guardianName:   '',
    guardianCpf:    '',
  })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  // Dados de assinatura e foto
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [photoData, setPhotoData]         = useState<string | null>(null)
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing]         = useState(false)
  const [isCanvasBlank, setIsCanvasBlank] = useState(true)

  const checkIfCanvasEmpty = useCallback(() => {
    if (!canvasRef.current) return true
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return true
    try {
      const pixelBuffer = new Uint32Array(
        ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height).data.buffer
      )
      return !pixelBuffer.some((color) => color !== 0)
    } catch {
      return true
    }
  }, [])

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    setDrawing(true)
    setError(null)
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = e.currentTarget.width / rect.width
    const scaleY = e.currentTarget.height / rect.height
    ctx.beginPath()
    ctx.moveTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = e.currentTarget.width / rect.width
    const scaleY = e.currentTarget.height / rect.height
    ctx.lineTo((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY)
    ctx.strokeStyle = '#e4e4e7'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const endDraw = () => {
    if (!drawing) return
    setDrawing(false)
    const data = canvasRef.current?.toDataURL('image/png')
    setSignatureData(data ?? null)
    setIsCanvasBlank(checkIfCanvasEmpty())
  }

  const clearSignature = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    setSignatureData(null)
    setIsCanvasBlank(true)
  }

  // ── Validação do formulário ─────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    if (formData.signerFullName.trim().length < 3) {
      errors.signerFullName = 'Nome completo deve ter ao menos 3 caracteres'
    }
    if (!isValidCpf(formData.signerCpf)) {
      errors.signerCpf = 'CPF inválido'
    }
    if (formData.isMinor) {
      if (formData.guardianName.trim().length < 3) {
        errors.guardianName = 'Nome do responsável deve ter ao menos 3 caracteres'
      }
      if (!isValidCpf(formData.guardianCpf)) {
        errors.guardianCpf = 'CPF do responsável inválido'
      }
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleFormContinue = () => {
    if (validateForm()) setStep('signature')
  }

  // ── Submit final ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!signatureData || !photoData || isCanvasBlank) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_base64: signatureData,
          photo_base64:     photoData,
          signer_full_name: formData.signerFullName.trim(),
          signer_cpf:       formData.signerCpf,
          is_minor:         formData.isMinor,
          guardian_name:    formData.isMinor ? formData.guardianName.trim() : undefined,
          guardian_cpf:     formData.isMinor ? formData.guardianCpf        : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao assinar contrato')

      router.push('/aluno/contratos?signed=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado ao registrar assinatura')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Indicador de etapa ──────────────────────────────────────────────────

  const steps: { key: Step; label: string }[] = [
    { key: 'form',      label: 'Dados'      },
    { key: 'signature', label: 'Assinatura' },
    { key: 'photo',     label: 'Foto'       },
  ]
  const stepIndex = steps.findIndex((s) => s.key === step)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-indigo-400 shrink-0" />
          Assinar Contrato
        </h1>
        <h2 className="text-sm font-semibold text-zinc-200 mt-2">{title}</h2>
        {description && (
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
        )}
      </div>

      {/* Botão de download do arquivo */}
      <a
        href={signedFileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors shadow-md"
      >
        <Download className="h-4 w-4" />
        Visualizar / Baixar {fileType.toUpperCase()}
      </a>

      {/* Indicador de progresso */}
      <div className="flex items-center gap-2">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                idx < stepIndex
                  ? 'bg-emerald-600 text-white'
                  : idx === stepIndex
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                {idx < stepIndex ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${
                idx === stepIndex ? 'text-zinc-200' : 'text-zinc-600'
              }`}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-px ${idx < stepIndex ? 'bg-emerald-700' : 'bg-zinc-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── ETAPA 0: Formulário de dados ─────────────────────────────── */}
      {step === 'form' && (
        <div className="space-y-4">

          {/* Nome completo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              Nome completo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.signerFullName}
              onChange={(e) => {
                setFormData((p) => ({ ...p, signerFullName: e.target.value }))
                if (formErrors.signerFullName) setFormErrors((p) => ({ ...p, signerFullName: undefined }))
              }}
              placeholder="Seu nome completo"
              className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:ring-1 focus:ring-indigo-500 ${
                formErrors.signerFullName ? 'border-red-700' : 'border-zinc-700 focus:border-indigo-500'
              }`}
            />
            {formErrors.signerFullName && (
              <p className="text-xs text-red-400">{formErrors.signerFullName}</p>
            )}
          </div>

          {/* CPF */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400">
              CPF <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.signerCpf}
              onChange={(e) => {
                const masked = maskCpf(e.target.value)
                setFormData((p) => ({ ...p, signerCpf: masked }))
                if (formErrors.signerCpf) setFormErrors((p) => ({ ...p, signerCpf: undefined }))
              }}
              placeholder="000.000.000-00"
              maxLength={14}
              className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:ring-1 focus:ring-indigo-500 font-mono ${
                formErrors.signerCpf ? 'border-red-700' : 'border-zinc-700 focus:border-indigo-500'
              }`}
            />
            {formErrors.signerCpf && (
              <p className="text-xs text-red-400">{formErrors.signerCpf}</p>
            )}
          </div>

          {/* Checkbox menor de idade */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.isMinor}
              onChange={(e) => {
                setFormData((p) => ({
                  ...p,
                  isMinor:     e.target.checked,
                  guardianName: '',
                  guardianCpf:  '',
                }))
                setFormErrors((p) => ({ ...p, guardianName: undefined, guardianCpf: undefined }))
              }}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-500"
            />
            <span className="text-sm text-zinc-300">Sou menor de 18 anos</span>
          </label>

          {/* Campos do responsável (condicional) */}
          {formData.isMinor && (
            <div className="space-y-4 rounded-xl border border-zinc-700/50 bg-zinc-900/40 p-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Dados do responsável legal
              </p>

              {/* Nome do responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">
                  Nome completo do responsável <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.guardianName}
                  onChange={(e) => {
                    setFormData((p) => ({ ...p, guardianName: e.target.value }))
                    if (formErrors.guardianName) setFormErrors((p) => ({ ...p, guardianName: undefined }))
                  }}
                  placeholder="Nome completo do responsável"
                  className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:ring-1 focus:ring-indigo-500 ${
                    formErrors.guardianName ? 'border-red-700' : 'border-zinc-700 focus:border-indigo-500'
                  }`}
                />
                {formErrors.guardianName && (
                  <p className="text-xs text-red-400">{formErrors.guardianName}</p>
                )}
              </div>

              {/* CPF do responsável */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">
                  CPF do responsável <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.guardianCpf}
                  onChange={(e) => {
                    const masked = maskCpf(e.target.value)
                    setFormData((p) => ({ ...p, guardianCpf: masked }))
                    if (formErrors.guardianCpf) setFormErrors((p) => ({ ...p, guardianCpf: undefined }))
                  }}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:ring-1 focus:ring-indigo-500 font-mono ${
                    formErrors.guardianCpf ? 'border-red-700' : 'border-zinc-700 focus:border-indigo-500'
                  }`}
                />
                {formErrors.guardianCpf && (
                  <p className="text-xs text-red-400">{formErrors.guardianCpf}</p>
                )}
              </div>
            </div>
          )}

          {/* Botão continuar */}
          <button
            type="button"
            onClick={handleFormContinue}
            className="w-full rounded-xl bg-indigo-600 py-4 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2"
          >
            Continuar
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── ETAPA 1: Canvas de assinatura ───────────────────────────── */}
      {step === 'signature' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400">
              Assinatura Manual <span className="text-red-400">*</span>
            </label>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-inner">
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/30">
                <span className="text-[10px] font-medium text-zinc-500">
                  Desenhe sua assinatura no quadro abaixo
                </span>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Limpar
                </button>
              </div>
              <canvas
                ref={canvasRef}
                width={400}
                height={180}
                className="w-full touch-none cursor-crosshair bg-zinc-950/40"
                onPointerDown={startDraw}
                onPointerMove={draw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={() => setStep('photo')}
              disabled={isCanvasBlank}
              className="flex-1 rounded-xl bg-indigo-600 py-4 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 2: Foto de confirmação + submit ────────────────────── */}
      {step === 'photo' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400">
              Foto de Confirmação <span className="text-red-400">*</span>
            </label>
            <SimpleCamera onCapture={(base64) => setPhotoData(base64)} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setPhotoData(null); setStep('signature') }}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-4 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!photoData || submitting}
              className="flex-1 rounded-xl bg-indigo-600 py-4 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando assinatura...
                </span>
              ) : (
                'Assinar contrato'
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
