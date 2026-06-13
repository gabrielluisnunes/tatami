'use client'

import { useRef, useState, useCallback } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'

interface GroupPhotoUploadProps {
  onSelect: (base64: string) => void
  onClear: () => void
  disabled?: boolean
}

async function compressImage(base64: string, maxPx = 1200): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = base64
  })
}

export function GroupPhotoUpload({ onSelect, onClear, disabled }: GroupPhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem (JPG, PNG, etc).')
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Imagem muito grande. Máximo 15MB.')
      return
    }

    setError(null)
    setCompressing(true)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const raw = ev.target?.result as string
        const compressed = await compressImage(raw)
        setPreview(compressed)
        onSelect(compressed)
      } catch {
        setError('Erro ao processar imagem.')
      } finally {
        setCompressing(false)
      }
    }
    reader.readAsDataURL(file)
  }, [onSelect])

  const handleClear = () => {
    setPreview(null)
    setError(null)
    onClear()
  }

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Foto da turma" className="w-full object-cover max-h-72" />
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-zinc-400 border border-zinc-700 hover:text-zinc-50 transition-colors backdrop-blur-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || compressing}
          className="flex h-56 w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/40 text-zinc-500 transition-colors hover:border-indigo-600/60 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {compressing ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm">Processando...</span>
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
                <Camera className="h-7 w-7" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-300">Foto da turma</p>
                <p className="text-xs text-zinc-600 mt-1">Toque para tirar ou selecionar</p>
              </div>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  )
}
