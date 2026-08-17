import {
  daysInMonth,
  dueDateForMonth,
  monthBounds,
  parseMonthParam,
  shiftMonth,
} from '@/lib/financial-month'

describe('financial-month', () => {
  describe('daysInMonth', () => {
    it('retorna 31 para janeiro', () => {
      expect(daysInMonth(2026, 1)).toBe(31)
    })

    it('retorna 28 para fevereiro não bissexto', () => {
      expect(daysInMonth(2026, 2)).toBe(28)
    })

    it('retorna 29 para fevereiro bissexto', () => {
      expect(daysInMonth(2024, 2)).toBe(29)
    })
  })

  describe('monthBounds', () => {
    it('monta primeiro e último dia do mês', () => {
      expect(monthBounds(2026, 8)).toEqual({
        first: '2026-08-01',
        last: '2026-08-31',
        key: '2026-08',
      })
    })
  })

  describe('dueDateForMonth', () => {
    it('respeita o dia de vencimento dentro do mês', () => {
      expect(dueDateForMonth(2026, 8, 10)).toBe('2026-08-10')
    })

    it('ajusta dia 31 em meses curtos', () => {
      expect(dueDateForMonth(2026, 2, 31)).toBe('2026-02-28')
    })

    it('não permite dia menor que 1', () => {
      expect(dueDateForMonth(2026, 8, 0)).toBe('2026-08-01')
    })
  })

  describe('parseMonthParam', () => {
    it('aceita YYYY-MM válido', () => {
      const result = parseMonthParam('2026-03')
      expect(result.year).toBe(2026)
      expect(result.month).toBe(3)
      expect(result.first).toBe('2026-03-01')
      expect(result.last).toBe('2026-03-31')
    })

    it('ignora valor inválido e cai no mês atual', () => {
      const result = parseMonthParam('nao-e-mes')
      expect(result.first).toMatch(/^\d{4}-\d{2}-01$/)
      expect(result.last).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('shiftMonth', () => {
    it('avança e volta o mês corretamente', () => {
      expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
      expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    })
  })
})
