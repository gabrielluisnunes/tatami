'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, CheckCircle2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { useFaceApi } from '@/hooks/use-face-api'
import Link from 'next/link'
import { LogoutButton } from '@/components/dashboard/logout-button'

export default function PerfilPage() {
  const faceApiStatus = useFaceApi()
  const modelsLoaded = faceApiStatus === 'ready'

  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [step, setStep] = useState<'view' | 'camera' | 'preview' | 'saving'>('view')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/students/profile/photo', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          setPhotoUrl(data.photo_url ?? null)
          setFullName(data.full_name ?? '')
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  async function startCamera() {
    setStep('camera')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch {
      setResult({ success: false, message: 'Não foi possível acessar a câmera.' })
      setStep('view')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capturePhoto() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      setCapturedBlob(blob)
      setCapturedPreview(canvas.toDataURL('image/jpeg'))
      stopCamera()
      setStep('preview')
    }, 'image/jpeg', 0.9)
  }

  async function savePhoto() {
    if (!capturedBlob) return
    setSaving(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('photo', capturedBlob, 'photo.jpg')

      const res = await fetch('/api/students/profile/photo', {
        method: 'PATCH',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar foto')
      }

      const data = await res.json()
      setPhotoUrl(data.photo_url ?? capturedPreview)
      setResult({ success: true, message: 'Foto atualizada com sucesso!' })
      setCapturedBlob(null)
      setCapturedPreview(null)
      setStep('view')
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao salvar foto'
      })
      setStep('preview')
    } finally {
      setSaving(false)
    }
  }

  function cancelCapture() {
    stopCamera()
    setCapturedBlob(null)
    setCapturedPreview(null)
    setStep('view')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-24 space-y-6 max-w-sm mx-auto">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Conta</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">Meu Perfil</h1>
      </div>

      {/* Foto atual */}
      {step === 'view' && (
        <div className="space-y-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex flex-col items-center gap-4">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-zinc-800"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-zinc-800 ring-4 ring-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-400">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-lg font-semibold text-zinc-100">{fullName}</p>
            </div>

            {result && (
              <div className={`mt-4 rounded-xl border p-3 flex items-center gap-2 ${
                result.success
                  ? 'border-emerald-800/40 bg-emerald-950/30'
                  : 'border-red-800/40 bg-red-950/30'
              }`}>
                {result.success
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                }
                <p className={`text-sm ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={startCamera}
              disabled={!modelsLoaded}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {modelsLoaded ? 'Atualizar foto' : 'Carregando câmera...'}
            </button>
          </div>

          {/* Ações da conta */}
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <Link
              href="/aluno/senha"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
            >
              <span className="text-sm text-zinc-200">Alterar senha</span>
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </Link>
            <div className="px-4 py-3">
              <LogoutButton showText={true} />
            </div>
          </div>
        </div>
      )}

      {/* Câmera */}
      {step === 'camera' && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900 aspect-square">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-full border-4 border-white/30" />
            </div>
          </div>
          <p className="text-center text-xs text-zinc-500">
            Posicione seu rosto dentro do círculo
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelCapture}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Capturar
            </button>
          </div>
        </div>
      )}

      {/* Preview */}
      {step === 'preview' && capturedPreview && (
        <div className="space-y-4">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capturedPreview}
              alt="Preview"
              className="h-48 w-48 rounded-full object-cover ring-4 ring-indigo-500 scale-x-[-1]"
            />
          </div>
          <p className="text-center text-sm text-zinc-400">
            Gostou da foto? Confirme para salvar.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelCapture}
              disabled={saving}
              className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-400 hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Tirar outra
            </button>
            <button
              type="button"
              onClick={savePhoto}
              disabled={saving}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Confirmar</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
