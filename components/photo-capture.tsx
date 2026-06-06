'use client'

import React, { useRef, useState } from 'react'
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { useFaceApi } from '@/hooks/use-face-api'
import { Button } from '@/components/ui/button'

interface PhotoCaptureProps {
  onCapture: (base64: string, descriptor: number[]) => void
  onClear: () => void
}

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Cap target dimensions to a maximum of 600px square for performance and size compression
  const targetSize = Math.min(pixelCrop.width, 600)
  canvas.width = targetSize
  canvas.height = targetSize

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  )

  // Compress to JPEG with 85% quality to yield an image size typically under 100KB (max 500KB limit)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function PhotoCapture({ onCapture, onClear }: PhotoCaptureProps) {
  const modelStatus = useFaceApi()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [preview, setPreview] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'no-face' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Cropping states
  const [isCropping, setIsCropping] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pixelCrop, setPixelCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validação de tipo
    if (!file.type.startsWith('image/')) {
      setErrorMessage('O arquivo deve ser uma imagem.')
      setStatus('error')
      return
    }

    // Validação de tamanho do arquivo original: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('A imagem deve ter no máximo 5MB.')
      setStatus('error')
      return
    }

    setErrorMessage(null)
    setStatus('idle')

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64String = event.target?.result as string
      setCropImageSrc(base64String)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setIsCropping(true)
    }
    reader.onerror = () => {
      setStatus('error')
      setErrorMessage('Erro ao ler o arquivo.')
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmCrop = async () => {
    if (!cropImageSrc || !pixelCrop) return

    setIsCropping(false)
    setDetecting(true)

    try {
      const croppedBase64 = await getCroppedImg(cropImageSrc, pixelCrop)
      setPreview(croppedBase64)

      // Detecção facial
      const faceapi = await import('@vladmandic/face-api')
      
      const img = new Image()
      img.src = croppedBase64
      img.onload = async () => {
        try {
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor()

          if (detection && detection.descriptor) {
            setStatus('success')
            const descriptorArray = Array.from(detection.descriptor)
            onCapture(croppedBase64, descriptorArray)
          } else {
            setStatus('no-face')
            setErrorMessage('Nenhum rosto detectado na imagem recortada. Tente outra foto ou enquadre melhor.')
            onClear()
          }
        } catch (err) {
          console.error('Erro na detecção facial:', err)
          setStatus('error')
          setErrorMessage('Erro ao processar imagem para detecção facial.')
          onClear()
        } finally {
          setDetecting(false)
        }
      }
      img.onerror = () => {
        setDetecting(false)
        setStatus('error')
        setErrorMessage('Erro ao carregar a imagem recortada.')
        onClear()
      }
    } catch (err) {
      console.error('Erro ao recortar imagem:', err)
      setDetecting(false)
      setStatus('error')
      setErrorMessage('Erro ao recortar a imagem.')
      onClear()
    }
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setCropImageSrc(null)
    setPixelCrop(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClear = () => {
    setPreview(null)
    setCropImageSrc(null)
    setPixelCrop(null)
    setStatus('idle')
    setErrorMessage(null)
    setDetecting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear()
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-400">
          Foto de cadastro <span className="text-red-500">*</span>
        </label>
        {modelStatus === 'loading' && (
          <span className="text-[11px] text-zinc-500 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
            Carregando modelos de IA...
          </span>
        )}
      </div>

      <div className="relative flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 overflow-hidden">
        {preview ? (
          <>
            {/* Imagem de preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="h-full w-full object-cover"
            />

            {/* Overlay de carregamento / detecção */}
            {detecting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                <span className="text-sm font-medium text-zinc-300">Detectando rosto...</span>
              </div>
            )}

            {/* Badges de sucesso / erro */}
            {!detecting && (
              <div className="absolute left-3 top-3 flex gap-2">
                {status === 'success' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm backdrop-blur-md">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Rosto detectado
                  </span>
                )}
                {status === 'no-face' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shadow-sm backdrop-blur-md">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Sem rosto detectado
                  </span>
                )}
              </div>
            )}

            {/* Botão limpar */}
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950/80 text-zinc-400 border border-zinc-800 hover:text-white hover:bg-zinc-900 transition-colors shadow-lg backdrop-blur-md"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          /* Estado sem foto */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
              <Camera className="h-6 w-6" />
            </div>
            {modelStatus === 'error' ? (
              <p className="text-xs text-red-400 mb-2">Erro ao inicializar IA de reconhecimento facial.</p>
            ) : (
              <p className="text-xs text-zinc-500 max-w-[240px] mb-4">
                Envie uma foto clara do rosto do aluno para reconhecimento facial.
              </p>
            )}
            
            <Button
              type="button"
              variant="outline"
              disabled={modelStatus === 'loading' || modelStatus === 'error'}
              onClick={triggerUpload}
              className="rounded-xl border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2"
            >
              <Upload className="h-4 w-4" />
              Selecionar foto
            </Button>
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      {errorMessage && (
        <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errorMessage}
        </p>
      )}

      {/* Interface de Crop/Recorte */}
      {isCropping && cropImageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-zinc-950/95 p-4 md:p-6 backdrop-blur-md">
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <h3 className="text-base font-bold text-zinc-100">Enquadrar Rosto</h3>
            <button
              type="button"
              onClick={handleCancelCrop}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cropper Container */}
          <div className="relative flex-1 w-full my-4 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 min-h-[300px]">
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedAreaPixels) => setPixelCrop(croppedAreaPixels)}
            />
          </div>

          {/* Zoom controls & Actions */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Zoom</span>
                <span>{zoom.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCrop}
                className="flex-1 rounded-xl border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white py-5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmCrop}
                className="flex-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-semibold py-5 shadow-lg shadow-indigo-600/20"
              >
                Confirmar Recorte
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
