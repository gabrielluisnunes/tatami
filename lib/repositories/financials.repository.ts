import { createAdminClient, createClient } from '@/lib/supabase/server'

type SupabaseClient = ReturnType<typeof createClient> | ReturnType<typeof createAdminClient>

export async function findByIdAndAcademy(
  supabase: SupabaseClient,
  financialId: string,
  academyId: string,
) {
  const { data, error } = await supabase
    .from('financials')
    .select('id, status')
    .eq('id', financialId)
    .eq('academy_id', academyId)
    .single()

  return { data, error }
}

export async function findStatusByIdAndStudent(
  supabase: SupabaseClient,
  financialId: string,
  studentId: string,
) {
  const { data, error } = await supabase
    .from('financials')
    .select('id, status, student_id')
    .eq('id', financialId)
    .eq('student_id', studentId)
    .single()

  return { data, error }
}

export async function findChargeByIdAndStudent(
  supabase: SupabaseClient,
  financialId: string,
  studentId: string,
) {
  const { data, error } = await supabase
    .from('financials')
    .select('id, amount, due_date, status, student_id')
    .eq('id', financialId)
    .eq('student_id', studentId)
    .single()

  return { data, error }
}

export async function updateStatus(
  supabase: SupabaseClient,
  financialId: string,
  status: string,
  extra: Record<string, string> = {},
) {
  return supabase
    .from('financials')
    .update({ status, ...extra })
    .eq('id', financialId)
}

export async function insertFinancial(
  supabase: SupabaseClient,
  row: {
    student_id: string
    academy_id: string
    amount: number
    due_date: string
    status: string
    paid_at?: string
  },
) {
  return supabase.from('financials').insert(row)
}

export async function findOpenInMonth(
  supabase: SupabaseClient,
  studentId: string,
  academyId: string,
  monthStart: string,
  monthEnd: string,
) {
  const { data, error } = await supabase
    .from('financials')
    .select('id, status, amount, due_date')
    .eq('student_id', studentId)
    .eq('academy_id', academyId)
    .gte('due_date', monthStart)
    .lte('due_date', monthEnd)
    .in('status', ['pending', 'overdue', 'aguardando_confirmacao'])
    .order('due_date', { ascending: true })
    .limit(1)

  return { data: data?.[0] ?? null, error }
}

export async function findExistingInMonth(
  supabase: SupabaseClient,
  studentId: string,
  monthStart: string,
  monthEnd: string,
) {
  const { data, error } = await supabase
    .from('financials')
    .select('id')
    .eq('student_id', studentId)
    .gte('due_date', monthStart)
    .lte('due_date', monthEnd)
    .limit(1)

  return { data, error }
}

export async function markPaid(
  supabase: SupabaseClient,
  financialId: string,
  paidAt: string,
  amount?: number,
) {
  const payload: Record<string, string | number> = {
    status: 'paid',
    paid_at: paidAt,
  }
  if (typeof amount === 'number') {
    payload.amount = amount
  }

  return supabase
    .from('financials')
    .update(payload)
    .eq('id', financialId)
}

export async function findPendingOverdueBefore(
  supabase: SupabaseClient,
  today: string,
) {
  return supabase
    .from('financials')
    .select('id, student_id, academy_id, amount, due_date, profiles!inner(full_name)')
    .eq('status', 'pending')
    .lt('due_date', today)
}

export async function updateStatusByIds(
  supabase: SupabaseClient,
  ids: string[],
  status: string,
) {
  return supabase
    .from('financials')
    .update({ status })
    .in('id', ids)
}

export async function listOverdueByAcademy(
  supabase: SupabaseClient,
  academyId: string,
  monthStart?: string,
  monthEnd?: string,
) {
  let query = supabase
    .from('financials')
    .select('id, student_id, amount, due_date, status')
    .eq('academy_id', academyId)
    .eq('status', 'overdue')

  if (monthStart) query = query.gte('due_date', monthStart)
  if (monthEnd) query = query.lte('due_date', monthEnd)

  return query.order('due_date', { ascending: true })
}
