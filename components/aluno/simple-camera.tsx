'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, RefreshCw, Loader2, CheckCircle } from 'lucide-react'

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'streaming'
  | 'captured'
  | 'confirmed'
  | 'camera-denied'
  | 'error'

interface SimpleCameraProps {
  onCapture: (base64: string | null) => void
}

export function SimpleCamera({ onCapture }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setCapturedImage(null)
    setErrorMsg(null)
    stopStream()
    onCapture(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('streaming')
    } catch (err) {
      const name = err && typeof err === 'object' && 'name' in err ? (err as { name?: string }).name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setStatus('camera-denied')
        setErrorMsg(
          'Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador e recarregue a página.'
        )
      } else if (name === 'NotFoundError') {
        setStatus('error')
        setErrorMsg('Câmera não encontrada. Conecte uma câmera e tente novamente.')
      } else {
        setStatus('error')
        setErrorMsg('Não foi possível acessar a câmera. Tente novamente.')
      }
    }
  }, [stopStream, onCapture])

  // Libera a câmera ao desmontar o componente
  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const SIZE = 600

    canvas.width = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Recorta o quadrado central do frame de vídeo
    let sx = 0
    let sy = 0
    let sw = video.videoWidth
    let sh = video.videoHeight
    if (sw > sh) {
      sx = (sw - sh) / 2
      sw = sh
    } else {
      sy = (sh - sw) / 2
      sh = sw
    }

    // Espelha horizontalmente para ficar natural
    ctx.save()
    ctx.translate(SIZE, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
    ctx.restore()

    const base64 = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(base64)
    stopStream()
    setStatus('captured')
  }

  const handleConfirm = () => {
    if (capturedImage) {
      setStatus('confirmed')
      onCapture(capturedImage)
    }
  }

  const handleRetake = () => {
    startCamera()
  }

  return (
    <div className="space-y-4">
      {/* Guia de enquadramento ou status */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-inner">
        {/* Vídeo ao Vivo */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover [transform:scaleX(-1)] ${
            capturedImage || status === 'idle' || status === 'requesting' ? 'hidden' : ''
          }`}
        />

        {/* Canvas oculto para crop e compressão */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Exibição da Imagem Capturada */}
        {capturedImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedImage} alt="Foto capturada" className="h-full w-full object-cover" />
        )}

        {/* Estado: Ocioso */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Camera className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="max-w-[220px] text-xs text-zinc-500 leading-relaxed">
              Precisamos de uma foto rápida para confirmar sua identidade na assinatura.
            </p>
          </div>
        )}

        {/* Estado: Solicitando Permissão */}
        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs text-zinc-500">Acessando câmera...</p>
          </div>
        )}

        {/* Badge: Confirmado com Sucesso */}
        {status === 'confirmed' && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
              <CheckCircle className="h-3.5 w-3.5" />
              Foto capturada
            </span>
          </div>
        )}

        {/* Estado: Erro ou Permissão Negada */}
        {(status === 'camera-denied' || status === 'error') && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Camera className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Linha guia (visível apenas transmitindo) */}
        {status === 'streaming' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-44 rounded-full border-2 border-dashed border-indigo-400/40 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="space-y-2">
        {status === 'idle' && (
          <button
            type="button"
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Abrir câmera
          </button>
        )}

        {status === 'streaming' && (
          <button
            type="button"
            onClick={handleCapture}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Tirar foto
          </button>
        )}

        {status === 'captured' && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Tirar novamente
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 transition-colors"
            >
              Usar esta foto
            </button>
          </div>
        )}

        {status === 'confirmed' && (
          <button
            type="button"
            onClick={handleRetake}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            Alterar foto
          </button>
        )}

        {(status === 'camera-denied' || status === 'error') && (
          <button
            type="button"
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  )
}
