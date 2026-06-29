'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface OverdueRecord {
  id: string
  student_id: string
  full_name: string
  amount: number
  due_date: string
}

interface OverdueTableProps {
  records: OverdueRecord[]
}

function daysOverdue(dueDateStr: string): number {
  const parts = dueDateStr.split('-').map(Number)
  const due = new Date(parts[0], parts[1] - 1, parts[2])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000))
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

export function OverdueTable({ records }: OverdueTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())

  const handleMarkPaid = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await fetch('/api/financials/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financial_id: id }),
      })
      if (res.ok) {
        setPaidIds(prev => new Set(prev).add(id))
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }

  const visible = records.filter(r => !paidIds.has(r.id))

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-10 text-zinc-600">
        <CheckCircle className="h-6 w-6 mb-2 text-emerald-600" />
        <p className="text-sm">Nenhuma mensalidade em atraso.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Aluno</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Valor</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Vencimento</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-400">Atraso</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-400"></th>
          </tr>
        </thead>
        <tbody>
          {visible.map(rec => {
            const days = daysOverdue(rec.due_date)
            const isLoading = loadingId === rec.id
            return (
              <tr key={rec.id} className="border-b border-zinc-800/40 last:border-0">
                <td className="px-4 py-3 font-medium text-zinc-200">{rec.full_name}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {rec.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {formatLocalDate(rec.due_date)}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    days > 30
                      ? 'bg-red-950/50 text-red-400'
                      : 'bg-amber-950/50 text-amber-400'
                  }`}>
                    {days}d
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleMarkPaid(rec.id)}
                    className="rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 text-xs h-7 px-3"
                  >
                    {isLoading
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : 'Marcar pago'}
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
