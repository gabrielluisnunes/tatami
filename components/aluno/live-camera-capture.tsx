'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Camera, RefreshCw, Loader2, CheckCircle, AlertCircle
} from 'lucide-react'
import { useFaceApi } from '@/hooks/use-face-api'
import { Button } from '@/components/ui/button'

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'streaming'
  | 'capturing'
  | 'detecting'
  | 'success'
  | 'no-face'
  | 'camera-denied'
  | 'error'

interface LiveCameraCaptureProps {
  onCapture: (base64: string, descriptor: number[]) => void
}

export function LiveCameraCapture({ onCapture }: LiveCameraCaptureProps) {
  const faceApiStatus = useFaceApi()

  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<CameraStatus>('idle')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setStatus('requesting')
    setCapturedImage(null)
    setErrorMsg(null)
    stopStream()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 640 },
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
  }, [stopStream])

  // Libera câmera ao desmontar
  useEffect(() => {
    return () => stopStream()
  }, [stopStream])

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || faceApiStatus !== 'ready') return

    setStatus('capturing')

    const video  = videoRef.current
    const canvas = canvasRef.current
    const SIZE   = 600

    canvas.width  = SIZE
    canvas.height = SIZE

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Recorta quadrado central do frame
    let sx = 0, sy = 0
    let sw = video.videoWidth, sh = video.videoHeight
    if (sw > sh) {
      sx = (sw - sh) / 2
      sw = sh
    } else {
      sy = (sh - sw) / 2
      sh = sw
    }

    // Espelha horizontalmente (câmera frontal mostra espelho, mas o rosto deve
    // ser salvo não-espelhado para comparação correta com face-api.js)
    ctx.save()
    ctx.translate(SIZE, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SIZE, SIZE)
    ctx.restore()

    const base64 = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(base64)

    // Para o stream imediatamente após capturar
    stopStream()

    setStatus('detecting')

    try {
      const faceapi = await import('@vladmandic/face-api')

      const img = new Image()
      img.src = base64
      await new Promise<void>((resolve, reject) => {
        img.onload  = () => resolve()
        img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      })

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection?.descriptor) {
        setStatus('success')
        onCapture(base64, Array.from(detection.descriptor))
      } else {
        setStatus('no-face')
        setErrorMsg(
          'Nenhum rosto detectado. Verifique a iluminação e tente novamente com o rosto bem centralizado.'
        )
      }
    } catch (err) {
      console.error('Erro na detecção facial:', err)
      setStatus('error')
      setErrorMsg('Erro ao processar a imagem. Tente novamente.')
    }
  }

  return (
    <div className="space-y-4">

      {/* Status dos modelos de IA */}
      {faceApiStatus === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-800/30 bg-indigo-950/30 px-4 py-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
          <span className="text-xs text-indigo-300">
            Carregando modelos de reconhecimento facial...
          </span>
        </div>
      )}

      {faceApiStatus === 'error' && (
        <div className="flex items-center gap-2 rounded-xl border border-red-800/30 bg-red-950/30 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span className="text-xs text-red-300">
            Erro ao carregar modelos de IA. Recarregue a página.
          </span>
        </div>
      )}

      {/* Área da câmera */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">

        {/* Vídeo ao vivo */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover [transform:scaleX(-1)] ${
            capturedImage || status === 'idle' || status === 'requesting' ? 'hidden' : ''
          }`}
        />

        {/* Canvas de captura (oculto) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Imagem capturada */}
        {capturedImage && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={capturedImage}
            alt="Foto capturada"
            className="h-full w-full object-cover"
          />
        )}

        {/* Estado: ocioso (antes de abrir câmera) */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Camera className="h-8 w-8 text-zinc-500" />
            </div>
            <p className="max-w-[200px] text-xs text-zinc-500">
              Clique em &quot;Abrir câmera&quot; quando estiver pronto.
            </p>
          </div>
        )}

        {/* Estado: solicitando permissão */}
        {status === 'requesting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
            <p className="text-xs text-zinc-500">Acessando câmera...</p>
          </div>
        )}

        {/* Estado: detectando */}
        {status === 'detecting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium text-zinc-200">Detectando rosto...</p>
          </div>
        )}

        {/* Badge: rosto detectado com sucesso */}
        {status === 'success' && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md">
              <CheckCircle className="h-3.5 w-3.5" />
              Rosto detectado
            </span>
          </div>
        )}

        {/* Estado: câmera negada ou erro sem captura */}
        {(status === 'camera-denied' || status === 'error') && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
              <Camera className="h-7 w-7 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400">{errorMsg}</p>
          </div>
        )}

        {/* Guia de enquadramento oval (visível apenas durante streaming) */}
        {status === 'streaming' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-44 rounded-full border-2 border-indigo-400/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      {/* Mensagem de erro após captura sem rosto */}
      {(status === 'no-face' || (status === 'error' && capturedImage)) && errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-800/30 bg-amber-950/30 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-300">{errorMsg}</p>
        </div>
      )}

      {/* Botões de ação */}
      <div className="space-y-2">

        {/* Abrir câmera (estado inicial) */}
        {status === 'idle' && (
          <Button
            type="button"
            onClick={startCamera}
            disabled={faceApiStatus === 'loading' || faceApiStatus === 'error'}
            className="w-full rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            <Camera className="mr-2 h-5 w-5" />
            {faceApiStatus === 'loading' ? 'Carregando IA...' : 'Abrir câmera'}
          </Button>
        )}

        {/* Tirar foto (durante streaming) */}
        {status === 'streaming' && (
          <Button
            type="button"
            onClick={handleCapture}
            disabled={faceApiStatus !== 'ready'}
            className="w-full rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50"
          >
            <Camera className="mr-2 h-5 w-5" />
            Tirar foto
          </Button>
        )}

        {/* Tentar novamente (após erro ou sem rosto) */}
        {(status === 'no-face' || status === 'error' || status === 'camera-denied') && (
          <Button
            type="button"
            onClick={startCamera}
            variant="outline"
            className="w-full rounded-xl border-zinc-700 py-6 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        )}

      </div>
    </div>
  )
}
