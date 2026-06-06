'use client'

import { useEffect, useRef, useState } from 'react'

type FaceApiStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useFaceApi() {
  const [status, setStatus] = useState<FaceApiStatus>('idle')
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    async function loadModels() {
      setStatus('loading')
      try {
        const faceapi = await import('@vladmandic/face-api')
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ])
        setStatus('ready')
      } catch (err) {
        console.error('Falha ao carregar modelos face-api.js:', err)
        setStatus('error')
      }
    }

    loadModels()
  }, [])

  return status
}
