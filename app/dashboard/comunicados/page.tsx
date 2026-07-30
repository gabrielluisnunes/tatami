'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ComunicadosPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    sent?: number
    failed?: number
    error?: string
  } | null>(null)

  async function handleSubmit() {
    if (!title.trim() || !message.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, error: data.error })
      } else {
        setResult({ success: true, sent: data.sent, failed: data.failed })
        setTitle('')
        setMessage('')
      }
    } catch {
      setResult({ success: false, error: 'Erro inesperado. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Comunicados
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Envie um comunicado por email para todos os alunos da academia.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
        {/* Título */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Título do comunicado
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Campeonato interno — inscrições abertas"
            maxLength={100}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5
              py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <p className="text-xs text-zinc-400 text-right">
            {title.length}/100
          </p>
        </div>

        {/* Mensagem */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Escreva o comunicado aqui..."
            maxLength={2000}
            rows={8}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5
              py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none
              focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
              resize-none"
          />
          <p className="text-xs text-zinc-400 text-right">
            {message.length}/2000
          </p>
        </div>

        {/* Resultado */}
        {result && (
          <div className={`rounded-xl border p-4 flex items-start gap-3 ${
            result.success 
              ? 'border-emerald-200 bg-emerald-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            {result.success 
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              : <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            }
            <div>
              {result.success ? (
                <>
                  <p className="text-sm font-semibold text-emerald-800">
                    Comunicado enviado com sucesso!
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {result.sent} email{result.sent !== 1 ? 's' : ''} enviado
                    {result.sent !== 1 ? 's' : ''}
                    {result.failed && result.failed > 0 
                      ? `, ${result.failed} falha${result.failed !== 1 ? 's' : ''}` 
                      : ''}
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-red-800">
                  {result.error ?? 'Erro ao enviar comunicado'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botão */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !title.trim() || !message.trim()}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5
            py-2.5 text-sm font-semibold text-white hover:bg-indigo-500
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading 
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            : <><Send className="h-4 w-4" /> Enviar comunicado</>
          }
        </button>
      </div>
    </div>
  )
}
