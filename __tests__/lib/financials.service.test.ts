import {
  getChargeForStudentPayment,
  markAsAwaitingConfirmation,
  markAsPaid,
  registerManualPayment,
} from '@/lib/services/financials.service'
import * as financialsRepo from '@/lib/repositories/financials.repository'

jest.mock('@/lib/repositories/financials.repository')

const repo = financialsRepo as jest.Mocked<typeof financialsRepo>

const supabase = {} as never

describe('financials.service', () => {
  describe('markAsPaid', () => {
    it('retorna not_found quando a cobrança não existe', async () => {
      repo.findByIdAndAcademy.mockResolvedValue({ data: null, error: null })

      const result = await markAsPaid(supabase, 'fin-1', 'academy-1')

      expect(result).toEqual({ ok: false, error: 'not_found' })
    })

    it('retorna already_paid quando status já é paid', async () => {
      repo.findByIdAndAcademy.mockResolvedValue({
        data: { id: 'fin-1', status: 'paid' },
        error: null,
      })

      const result = await markAsPaid(supabase, 'fin-1', 'academy-1')

      expect(result).toEqual({ ok: false, error: 'already_paid' })
      expect(repo.updateStatus).not.toHaveBeenCalled()
    })

    it('marca como pago com sucesso', async () => {
      repo.findByIdAndAcademy.mockResolvedValue({
        data: { id: 'fin-1', status: 'overdue' },
        error: null,
      })
      repo.updateStatus.mockResolvedValue({ error: null } as never)

      const result = await markAsPaid(supabase, 'fin-1', 'academy-1')

      expect(result).toEqual({ ok: true })
      expect(repo.updateStatus).toHaveBeenCalledWith(
        supabase,
        'fin-1',
        'paid',
        expect.objectContaining({ paid_at: expect.any(String) }),
      )
    })
  })

  describe('markAsAwaitingConfirmation', () => {
    it('rejeita status inválido', async () => {
      repo.findStatusByIdAndStudent.mockResolvedValue({
        data: { id: 'fin-1', status: 'paid', student_id: 'stu-1' },
        error: null,
      })

      const result = await markAsAwaitingConfirmation(supabase, 'fin-1', 'stu-1')

      expect(result).toEqual({ ok: false, error: 'invalid_status' })
    })

    it('atualiza pending para aguardando_confirmacao', async () => {
      repo.findStatusByIdAndStudent.mockResolvedValue({
        data: { id: 'fin-1', status: 'pending', student_id: 'stu-1' },
        error: null,
      })
      repo.updateStatus.mockResolvedValue({ error: null } as never)

      const result = await markAsAwaitingConfirmation(supabase, 'fin-1', 'stu-1')

      expect(result).toEqual({ ok: true })
      expect(repo.updateStatus).toHaveBeenCalledWith(
        supabase,
        'fin-1',
        'aguardando_confirmacao',
      )
    })
  })

  describe('registerManualPayment (opção 2)', () => {
    it('quita cobrança aberta do mês em vez de criar outra', async () => {
      repo.findOpenInMonth.mockResolvedValue({
        data: { id: 'fin-open', status: 'overdue', amount: 175, due_date: '2026-08-01' },
        error: null,
      })
      repo.markPaid.mockResolvedValue({ error: null } as never)

      const result = await registerManualPayment(supabase, {
        studentId: 'stu-1',
        academyId: 'academy-1',
        amount: 175,
        paidAt: '2026-08-16T12:00:00.000Z',
      })

      expect(result).toEqual({ ok: true, mode: 'updated' })
      expect(repo.markPaid).toHaveBeenCalledWith(
        supabase,
        'fin-open',
        '2026-08-16T12:00:00.000Z',
        175,
      )
      expect(repo.insertFinancial).not.toHaveBeenCalled()
    })

    it('cria cobrança nova quando não há aberta no mês', async () => {
      repo.findOpenInMonth.mockResolvedValue({ data: null, error: null })
      repo.insertFinancial.mockResolvedValue({ error: null } as never)

      const result = await registerManualPayment(supabase, {
        studentId: 'stu-1',
        academyId: 'academy-1',
        amount: 175,
        paidAt: '2026-08-16T12:00:00.000Z',
      })

      expect(result).toEqual({ ok: true, mode: 'created' })
      expect(repo.insertFinancial).toHaveBeenCalledWith(
        supabase,
        expect.objectContaining({
          student_id: 'stu-1',
          academy_id: 'academy-1',
          amount: 175,
          status: 'paid',
          paid_at: '2026-08-16T12:00:00.000Z',
        }),
      )
      expect(repo.markPaid).not.toHaveBeenCalled()
    })
  })

  describe('getChargeForStudentPayment', () => {
    it('permite pending e overdue', async () => {
      repo.findChargeByIdAndStudent.mockResolvedValue({
        data: {
          id: 'fin-1',
          amount: 175,
          due_date: '2026-08-01',
          status: 'pending',
          student_id: 'stu-1',
        },
        error: null,
      })

      const result = await getChargeForStudentPayment(supabase, 'fin-1', 'stu-1')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.financial.status).toBe('pending')
      }
    })

    it('rejeita cobrança já paga', async () => {
      repo.findChargeByIdAndStudent.mockResolvedValue({
        data: {
          id: 'fin-1',
          amount: 175,
          due_date: '2026-08-01',
          status: 'paid',
          student_id: 'stu-1',
        },
        error: null,
      })

      const result = await getChargeForStudentPayment(supabase, 'fin-1', 'stu-1')

      expect(result).toEqual({ ok: false, error: 'invalid_status' })
    })
  })
})
