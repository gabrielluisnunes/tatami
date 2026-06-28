import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendOverdueAlert } from '@/lib/notifications'

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yesterdayStr = `${yesterday.getUTCFullYear()}-${pad(yesterday.getUTCMonth() + 1)}-${pad(yesterday.getUTCDate())}`

  const { data: overdue, error: fetchError } = await supabase
    .from('financials')
    .select('id, student_id, academy_id, amount, due_date, profiles!inner(full_name, email)')
    .eq('status', 'pending')
    .lte('due_date', yesterdayStr)

  if (fetchError) {
    console.error('Erro ao buscar pendentes:', fetchError)
    return NextResponse.json({ error: 'Erro ao buscar pendentes' }, { status: 500 })
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const ids = overdue.map(f => f.id)

  const { error: updateError } = await supabase
    .from('financials')
    .update({ status: 'overdue' })
    .in('id', ids)

  if (updateError) {
    console.error('Erro ao atualizar status:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }

  const academyIds = Array.from(new Set(overdue.map(f => f.academy_id).filter(Boolean)))

  const { data: academiesData } = await supabase
    .from('academies')
    .select('id, name')
    .in('id', academyIds)

  const academyNameMap = new Map(academiesData?.map(a => [a.id, a.name]) ?? [])

  for (const record of overdue) {
    const profileObj = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
    const profile = profileObj as unknown as { full_name: string; email: string } | null
    if (!profile) continue

    const [y, m, d] = record.due_date.split('-')
    const formattedDate = `${d}/${m}/${y}`
    const academyName = academyNameMap.get(record.academy_id) ?? 'sua academia'

    sendOverdueAlert(
      profile.email,
      profile.full_name,
      record.amount,
      formattedDate,
      academyName,
    ).catch(err => console.error(`Falha no email atraso ${record.id}:`, err))
  }

  return NextResponse.json({ updated: ids.length })
}
