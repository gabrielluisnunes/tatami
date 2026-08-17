import { createAdminClient, createClient } from '@/lib/supabase/server'
import * as financialsRepo from '@/lib/repositories/financials.repository'
import { getBrasiliaParts, monthBounds } from '@/lib/financial-month'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

export type FinancialServiceError =
  | 'not_found'
  | 'already_paid'
  | 'invalid_status'
  | 'update_failed'
  | 'insert_failed'

export async function markAsPaid(
  supabase: SupabaseClient,
  financialId: string,
  academyId: string,
): Promise<{ ok: true } | { ok: false; error: FinancialServiceError }> {
  const { data: financial } = await financialsRepo.findByIdAndAcademy(
    supabase,
    financialId,
    academyId,
  )

  if (!financial) return { ok: false, error: 'not_found' }
  if (financial.status === 'paid') return { ok: false, error: 'already_paid' }

  const { error } = await financialsRepo.updateStatus(supabase, financialId, 'paid', {
    paid_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: 'update_failed' }
  return { ok: true }
}

export async function markAsAwaitingConfirmation(
  supabase: SupabaseClient,
  financialId: string,
  studentId: string,
): Promise<{ ok: true } | { ok: false; error: FinancialServiceError }> {
  const { data: financial } = await financialsRepo.findStatusByIdAndStudent(
    supabase,
    financialId,
    studentId,
  )

  if (!financial) return { ok: false, error: 'not_found' }

  if (!['pending', 'overdue'].includes(financial.status)) {
    return { ok: false, error: 'invalid_status' }
  }

  const { error } = await financialsRepo.updateStatus(
    supabase,
    financialId,
    'aguardando_confirmacao',
  )

  if (error) return { ok: false, error: 'update_failed' }
  return { ok: true }
}

/**
 * Opção 2: se já existe cobrança aberta no mês (Brasília), quita ela.
 * Só cria cobrança nova se não houver nenhuma aberta no mês.
 */
export async function registerManualPayment(
  supabase: SupabaseClient,
  input: {
    studentId: string
    academyId: string
    amount: number
    paidAt: string
  },
): Promise<
  | { ok: true; mode: 'updated' | 'created' }
  | { ok: false; error: FinancialServiceError }
> {
  const { year, month, day } = getBrasiliaParts()
  const { first: monthStart, last: monthEnd } = monthBounds(year, month)

  const { data: openCharge, error: findError } = await financialsRepo.findOpenInMonth(
    supabase,
    input.studentId,
    input.academyId,
    monthStart,
    monthEnd,
  )

  if (findError) return { ok: false, error: 'update_failed' }

  if (openCharge) {
    const { error } = await financialsRepo.markPaid(
      supabase,
      openCharge.id,
      input.paidAt,
      input.amount,
    )
    if (error) return { ok: false, error: 'update_failed' }
    return { ok: true, mode: 'updated' }
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const due_date = `${year}-${pad(month)}-${pad(day)}`

  const { error } = await financialsRepo.insertFinancial(supabase, {
    student_id: input.studentId,
    academy_id: input.academyId,
    amount: input.amount,
    due_date,
    paid_at: input.paidAt,
    status: 'paid',
  })

  if (error) return { ok: false, error: 'insert_failed' }
  return { ok: true, mode: 'created' }
}

export async function getChargeForStudentPayment(
  supabase: SupabaseClient,
  financialId: string,
  studentId: string,
): Promise<
  | {
      ok: true
      financial: {
        id: string
        amount: number
        due_date: string
        status: string
        student_id: string
      }
    }
  | { ok: false; error: FinancialServiceError }
> {
  const { data: financial } = await financialsRepo.findChargeByIdAndStudent(
    supabase,
    financialId,
    studentId,
  )

  if (!financial) return { ok: false, error: 'not_found' }

  if (!['pending', 'overdue'].includes(financial.status)) {
    return { ok: false, error: 'invalid_status' }
  }

  return { ok: true, financial }
}
