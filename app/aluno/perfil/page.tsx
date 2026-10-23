'use client'

import { useState, useEffect } from 'react'
import { Camera, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { LiveCameraCapture } from '@/components/aluno/live-camera-capture'

export default function PerfilPage() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [step, setStep] = useState<'view' | 'camera'>('view')
  const [capturedB64, setCapturedB64] = useState<string | null>(null)
  const [descriptor, setDescriptor] = useState<number[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

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

  function handleCapture(base64: string, desc: number[]) {
    setCapturedB64(base64)
    setDescriptor(desc)
    setResult(null)
  }

  function handleResetCapture() {
    setCapturedB64(null)
    setDescriptor(null)
  }

  function cancelCapture() {
    handleResetCapture()
    setStep('view')
  }

  async function savePhoto() {
    if (!capturedB64 || !descriptor) return
    setSaving(true)
    setResult(null)

    try {
      const res = await fetch('/api/students/profile/photo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_base64: capturedB64,
          face_descriptor: descriptor,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar foto')
      }

      const data = await res.json()
      setPhotoUrl(data.photo_url ?? capturedB64)
      setResult({ success: true, message: 'Foto atualizada com sucesso!' })
      handleResetCapture()
      setStep('view')
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao salvar foto',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Meu Perfil</h1>
        <p className="text-sm text-zinc-500 mt-1">Foto e configurações da conta</p>
      </div>

      {step === 'view' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-col items-center gap-4">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-zinc-100"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-zinc-100 ring-4 ring-zinc-200 flex items-center justify-center text-3xl font-bold text-zinc-400">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="text-lg font-semibold text-zinc-900">{fullName}</p>
            </div>

            {result && (
              <div className={`mt-4 rounded-xl border p-3 flex items-center gap-2 ${
                result.success
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-red-200 bg-red-50'
              }`}>
                {result.success
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                }
                <p className={`text-sm ${result.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {result.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                handleResetCapture()
                setResult(null)
                setStep('camera')
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Atualizar foto
            </button>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <Link
              href="/aluno/senha"
              className="flex items-center justify-between px-4 py-3.5 hover:bg-zinc-50 transition-colors border-b border-zinc-100"
            >
              <span className="text-sm text-zinc-700">Alterar senha</span>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </Link>
            <div className="px-4 py-3">
              <LogoutButton
                showText={true}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              />
            </div>
          </div>
        </div>
      )}

      {step === 'camera' && (
        <div className="space-y-4">
          <LiveCameraCapture onCapture={handleCapture} onReset={handleResetCapture} />

          {result && !result.success && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-800">{result.message}</p>
            </div>
          )}

          {descriptor && (
            <button
              type="button"
              onClick={savePhoto}
              disabled={saving}
              className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><CheckCircle2 className="h-4 w-4" /> Confirmar foto</>
              }
            </button>
          )}

          <button
            type="button"
            onClick={cancelCapture}
            disabled={saving}
            className="w-full rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
