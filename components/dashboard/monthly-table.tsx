'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2, CheckCircle2 } from 'lucide-react'

interface MonthlyRecord {
  id: string | null
  student_id: string
  full_name: string
  payment_due_day: number | null
  amount: number | null
  due_date: string | null
  paid_at: string | null
  status: string
  has_charge: boolean
}

interface MonthlyTableProps {
  records: MonthlyRecord[]
}

type Filter = 'all' | 'paid' | 'pending' | 'overdue' | 'waiting'

const statusConfig = {
  paid:    { label: 'Pago',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pendente',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Atrasado',    cls: 'bg-red-50 text-red-700 border-red-200' },
  waiting: { label: 'Aguardando',  cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
}

const tabs: { key: Filter; label: string }[] = [
  { key: 'all',     label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'paid',    label: 'Pagos' },
  { key: 'overdue', label: 'Em atraso' },
  { key: 'waiting', label: 'Aguardando' },
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
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())

  // Reset page to 1 whenever search or filter (activeTab) changes
  useEffect(() => {
    setPage(1)
  }, [search, filter])

  const handleMarkPaid = async (financialId: string, studentId: string) => {
    setLoadingId(financialId)
    try {
      const res = await fetch('/api/financials/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ financial_id: financialId }),
      })
      if (res.ok) {
        setPaidIds(prev => {
          const next = new Set(prev)
          next.add(studentId)
          return next
        })
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  // Filtragem client-side: filtrar records pelo full_name contendo o termo buscado (case-insensitive)
  const searchedRecords = records.filter(r =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
  )

  // Aplicar busca + filtro de status -> filteredRecords
  const filteredRecords = searchedRecords.filter(r => {
    const isPaid = paidIds.has(r.student_id)
    const currentStatus = isPaid ? 'paid' : r.status
    const currentHasCharge = r.has_charge

    if (filter === 'all') return true
    if (filter === 'pending') return currentHasCharge && currentStatus === 'pending'
    if (filter === 'paid') return currentStatus === 'paid'
    if (filter === 'overdue') return currentStatus === 'overdue'
    if (filter === 'waiting') return !currentHasCharge
    return false
  })

  // Fatiar: paginatedRecords = filteredRecords.slice((page-1)*10, page*10)
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE)
  const paginatedRecords = filteredRecords.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const total = filteredRecords.length
  const start = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1
  const end = Math.min(page * ITEMS_PER_PAGE, total)

  return (
    <div className="space-y-4">
      {/* Buscador por nome */}
      <div className="relative w-full">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full pl-9 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs de filtro por status */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50/75 p-1 w-fit">
        {tabs.map(tab => {
          const count = searchedRecords.filter(r => {
            const isPaid = paidIds.has(r.student_id)
            const currentStatus = isPaid ? 'paid' : r.status
            const currentHasCharge = r.has_charge

            if (tab.key === 'all') return true
            if (tab.key === 'pending') return currentHasCharge && currentStatus === 'pending'
            if (tab.key === 'paid') return currentStatus === 'paid'
            if (tab.key === 'overdue') return currentStatus === 'overdue'
            if (tab.key === 'waiting') return !currentHasCharge
            return false
          }).length

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50'
                  : 'text-gray-500 hover:text-gray-950'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filteredRecords.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-xl">
          Nenhum registro encontrado.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Aluno</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Dia de pagamento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Vencimento</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Ação</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.map(rec => {
                const isPaidOptimistic = paidIds.has(rec.student_id)
                const currentStatus = isPaidOptimistic ? 'paid' : rec.status
                const currentHasCharge = rec.has_charge
                const isLoading = loadingId === rec.id

                let badgeCfg = statusConfig.waiting
                if (currentHasCharge) {
                  badgeCfg = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.pending
                }

                return (
                  <tr key={rec.student_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{rec.full_name}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {rec.payment_due_day ? `Dia ${rec.payment_due_day}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {rec.due_date ? formatLocalDate(rec.due_date) : 'Aguardando'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {rec.amount !== null
                        ? rec.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium border ${badgeCfg.cls}`}>
                        {badgeCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rec.has_charge &&
                       rec.id !== null &&
                       (currentStatus === 'pending' || currentStatus === 'overdue') &&
                       !isPaidOptimistic && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleMarkPaid(rec.id!, rec.student_id)}
                          className="inline-flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1 text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Pago
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Controles de Paginação */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-gray-500">
            Mostrando {start}–{end} de {total} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Anterior
            </button>
            <span className="text-xs text-gray-500 font-medium px-2">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
