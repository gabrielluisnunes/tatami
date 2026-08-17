interface BarItem {
  label: string
  value: number
  color: string
}

interface DashboardChartsProps {
  monthLabel: string
  charges: {
    paid: number
    pending: number
    overdue: number
    awaiting: number
    noCharge: number
  }
  attendanceByDay: { day: string; count: number }[]
}

function HorizontalBars({ items }: { items: BarItem[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-600">{item.label}</span>
            <span className="tabular-nums text-zinc-900">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className={`h-full rounded-full transition-all ${item.color}`}
              style={{ width: `${Math.round((item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function DayBars({ days }: { days: { day: string; count: number }[] }) {
  const max = Math.max(...days.map((d) => d.count), 1)

  if (days.length === 0) {
    return <p className="text-sm text-zinc-400">Nenhuma presença neste mês ainda.</p>
  }

  return (
    <div className="flex h-36 items-end gap-1.5">
      {days.map((d) => {
        const pct = Math.max(d.count === 0 ? 0 : 8, Math.round((d.count / max) * 100))
        return (
          <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-zinc-500">{d.count || ''}</span>
            <div
              className="w-full max-w-[28px] rounded-t bg-emerald-500/80"
              style={{ height: `${pct}%` }}
              title={`${d.day}: ${d.count}`}
            />
            <span className="truncate text-[10px] text-zinc-400">{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardCharts({ monthLabel, charges, attendanceByDay }: DashboardChartsProps) {
  const chargeItems: BarItem[] = [
    { label: 'Pagas', value: charges.paid, color: 'bg-emerald-500' },
    { label: 'Pendentes', value: charges.pending, color: 'bg-amber-400' },
    { label: 'Em atraso', value: charges.overdue, color: 'bg-red-500' },
    { label: 'Aguard. confirmação', value: charges.awaiting, color: 'bg-sky-500' },
    { label: 'Sem cobrança', value: charges.noCharge, color: 'bg-zinc-300' },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 lg:p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Mensalidades</h2>
        <p className="mb-4 text-xs text-zinc-500 capitalize">{monthLabel}</p>
        <HorizontalBars items={chargeItems} />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 lg:p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Presenças no mês</h2>
        <p className="mb-4 text-xs text-zinc-500 capitalize">{monthLabel}</p>
        <DayBars days={attendanceByDay} />
      </div>
    </div>
  )
}
