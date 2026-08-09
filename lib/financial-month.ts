/** Utilitários de mês financeiro (calendário Brasília, UTC-3). */

export function getBrasiliaParts(date = new Date()) {
  const brasilia = new Date(date.getTime() - 3 * 60 * 60 * 1000)
  return {
    year: brasilia.getUTCFullYear(),
    month: brasilia.getUTCMonth() + 1,
    day: brasilia.getUTCDate(),
  }
}

export function pad2(n: number) {
  return String(n).padStart(2, '0')
}

export function monthKey(year: number, month: number) {
  return `${year}-${pad2(month)}`
}

/** Último dia do mês (1–12). */
export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function monthBounds(year: number, month: number) {
  const last = daysInMonth(year, month)
  return {
    first: `${year}-${pad2(month)}-01`,
    last: `${year}-${pad2(month)}-${pad2(last)}`,
    key: monthKey(year, month),
  }
}

/** Aceita `YYYY-MM` ou cai no mês atual (Brasília). */
export function parseMonthParam(param?: string) {
  const current = getBrasiliaParts()
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split('-').map(Number)
    if (month >= 1 && month <= 12) {
      return { year, month, ...monthBounds(year, month) }
    }
  }
  return {
    year: current.year,
    month: current.month,
    ...monthBounds(current.year, current.month),
  }
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

/** Dia de vencimento no mês, respeitando meses curtos (ex.: 31 → 28/29/30). */
export function dueDateForMonth(year: number, month: number, paymentDueDay: number) {
  const day = Math.min(Math.max(1, paymentDueDay), daysInMonth(year, month))
  return `${year}-${pad2(month)}-${pad2(day)}`
}
