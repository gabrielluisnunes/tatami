'use client'

import { useState } from 'react'

interface MonthlyRecord {
  id: string
  full_name: string
  amount: number
  due_date: string
  paid_at: string | null
  status: 'pending' | 'paid' | 'overdue'
}

interface MonthlyTableProps {
  records: MonthlyRecord[]
}

type Filter = 'all' | 'paid' | 'pending' | 'overdue'

const statusConfig = {
  paid:    { label: 'Pago',      cls: 'bg-emerald-950/50 text-emerald-400' },
  pending: { label: 'Pendente',  cls: 'bg-zinc-800/80 text-zinc-400' },
  overdue: { label: 'Em atraso', cls: 'bg-red-950/50 text-red-400' },
}

const tabs: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'Todos'     },
  { key: 'paid',    label: 'Pagos'     },
  { key: 'pending', label: 'Pendentes' },
  { key: 'overdue', label: 'Em atraso' },
]

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

export function MonthlyTable({ records }: MonthlyTableProps) {
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px] opacity-60">
              {tab.key === 'all'
                ? records.length
                : records.filter(r => r.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">Nenhum registro encontrado.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Aluno</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rec => {
                const cfg = statusConfig[rec.status]
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
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {rec.paid_at ? formatLocalDate(rec.paid_at) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
