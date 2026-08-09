import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthKey, shiftMonth, getBrasiliaParts } from '@/lib/financial-month'

interface FinanceiroMonthNavProps {
  year: number
  month: number
  label: string
}

export function FinanceiroMonthNav({ year, month, label }: FinanceiroMonthNavProps) {
  const current = getBrasiliaParts()
  const currentKey = monthKey(current.year, current.month)
  const thisKey = monthKey(year, month)

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)
  const prevHref = `/dashboard/financeiro?month=${monthKey(prev.year, prev.month)}`
  const nextHref = `/dashboard/financeiro?month=${monthKey(next.year, next.month)}`
  const canGoNext = thisKey < currentKey

  return (
    <div className="flex items-center gap-1">
      <Link
        href={prevHref}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-[9.5rem] text-center text-sm font-medium text-zinc-700 capitalize tabular-nums">
        {label}
      </span>
      {canGoNext ? (
        <Link
          href={nextHref}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-100 text-zinc-300"
          aria-hidden
        >
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  )
}
