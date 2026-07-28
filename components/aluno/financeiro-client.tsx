'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, Copy, X, QrCode, AlertCircle } from 'lucide-react'
import QRCode from 'qrcode'

interface FinancialRecord {
  id: string
  amount: number
  due_date: string
  paid_at: string | null
  status: string
}

interface FinanceiroClientProps {
  financials: FinancialRecord[]
  hasPix: boolean
}

const statusConfig = {
  paid: { label: 'Pago', cls: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/30' },
  pending: { label: 'Pendente', cls: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/30' },
  overdue: { label: 'Em atraso', cls: 'bg-red-950/50 text-red-400 border-red-800/30' },
  aguardando_confirmacao: { label: 'Aguardando confirmação', cls: 'bg-blue-950/50 text-blue-400 border-blue-800/30' },
}

function formatLocalDate(dateStr: string) {
  if (!dateStr) return '—'
  if (dateStr.includes('T') || dateStr.includes(':')) {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export default function FinanceiroClient({ financials, hasPix }: FinanceiroClientProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  // Estados do Modal
  const [pixModal, setPixModal] = useState<{
    financialId: string
    amount: number
    description: string
  } | null>(null)

  const [pixData, setPixData] = useState<{
    pix_payload: string
    pix_key: string
    pix_key_type: string
    amount: number
    description: string
    academy_name: string
  } | null>(null)

  const [loadingPix, setLoadingPix] = useState(false)
  const [pixPaid, setPixPaid] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Gerar o QR Code client-side
  useEffect(() => {
    if (!pixData?.pix_payload) {
      setQrCodeUrl(null)
      return
    }
    QRCode.toDataURL(pixData.pix_payload, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(setQrCodeUrl)
      .catch(err => {
        console.error('Erro ao gerar QR Code:', err)
      })
  }, [pixData])

  async function openPixModal(financialId: string, amount: number, description: string) {
    setPixModal({ financialId, amount, description })
    setLoadingPix(true)
    setPixData(null)
    setPixPaid(false)
    setError(null)
    try {
      const res = await fetch(`/api/financials/pix/${financialId}`)
      if (res.ok) {
        const data = await res.json()
        setPixData(data)
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'Erro ao carregar dados do PIX')
      }
    } catch {
      setError('Erro de conexão ao carregar PIX')
    } finally {
      setLoadingPix(false)
    }
  }

  async function handleJaPaguei(financialId: string) {
    setMarkingPaid(true)
    setError(null)
    try {
      const res = await fetch(`/api/financials/${financialId}/aguardando`, {
        method: 'PATCH'
      })
      if (res.ok) {
        setPixPaid(true)
        setTimeout(() => {
          setPixModal(null)
          setPixData(null)
          setPixPaid(false)
          router.refresh()
        }, 2000)
      } else {
        const errData = await res.json().catch(() => ({}))
        setError(errData.error || 'Erro ao confirmar pagamento')
      }
    } catch {
      setError('Erro de conexão ao registrar pagamento')
    } finally {
      setMarkingPaid(false)
    }
  }

  async function handleCopy() {
    if (!pixData?.pix_payload) return
    try {
      await navigator.clipboard.writeText(pixData.pix_payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <div className="space-y-2">
      {financials.map(f => {
        const cfg = statusConfig[f.status as keyof typeof statusConfig] ?? statusConfig.pending
        const isPendingOrOverdue = ['pending', 'overdue'].includes(f.status)

        const dueDate = new Date(f.due_date + 'T00:00:00')
        const monthYear = dueDate.toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric'
        })
        const desc = `Mensalidade de ${monthYear}`

        return (
          <div
            key={f.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {f.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Venc. {formatLocalDate(f.due_date)}
                {f.paid_at && ` · Pago em ${formatLocalDate(f.paid_at)}`}
              </p>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                {cfg.label}
              </span>

              {isPendingOrOverdue && hasPix && (
                <button
                  type="button"
                  onClick={() => openPixModal(f.id, f.amount, desc)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-100 bg-indigo-600 hover:bg-indigo-500 transition-colors border border-indigo-500 rounded-lg px-3 py-1.5 shadow-sm"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Pagar via PIX
                </button>
              )}
            </div>
          </div>
        )
      })}

      {/* Modal PIX */}
      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !markingPaid && setPixModal(null)}
          />

          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-zinc-100 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-indigo-400" />
                Pagar via PIX
              </h3>
              <button
                type="button"
                onClick={() => !markingPaid && setPixModal(null)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                disabled={markingPaid}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {loadingPix && (
              <div className="flex flex-col items-center justify-center py-10 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-xs text-zinc-400">Gerando QR Code PIX...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-950/30 border border-red-900/40 rounded-xl flex items-start space-x-3 text-red-400">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                <div>
                  <p className="text-xs">{error}</p>
                </div>
              </div>
            )}

            {!loadingPix && pixData && (
              <div className="space-y-4">
                {/* QR Code Container */}
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl border border-zinc-800">
                    {qrCodeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrCodeUrl} alt="PIX QR Code" className="h-48 w-48 object-contain" />
                    ) : (
                      <div className="h-48 w-48 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-zinc-900" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-center">
                  <p className="text-xl font-bold text-zinc-100">
                    {pixData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Beneficiário: <strong className="text-zinc-200">{pixData.academy_name}</strong>
                  </p>
                  <p className="text-[11px] text-zinc-500 italic">
                    {pixData.description}
                  </p>
                </div>

                {/* Copy and Paste PIX */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Código Copia e Cola</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixData.pix_payload}
                      className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                {pixPaid && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/40 rounded-xl flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <p className="text-xs font-medium">
                      Pagamento registrado! Aguarde a confirmação da academia.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {!pixPaid && (
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setPixModal(null)}
                      disabled={markingPaid}
                      className="flex-1 border border-zinc-800 hover:bg-zinc-900 rounded-xl py-2.5 text-xs font-medium text-zinc-400 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJaPaguei(pixModal.financialId)}
                      disabled={markingPaid}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {markingPaid ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        'Já paguei'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
