import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendOverdueAlert } from '@/lib/notifications'
import { getBrasiliaParts, pad2 } from '@/lib/financial-month'
import {
  findPendingOverdueBefore,
  updateStatusByIds,
} from '@/lib/repositories/financials.repository'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { year, month, day } = getBrasiliaParts()
  const today = `${year}-${pad2(month)}-${pad2(day)}`

  console.log(`[update-overdue] Data Brasília: ${today}`)

  const { data: overdue, error: fetchError } = await findPendingOverdueBefore(
    supabase,
    today,
  )

  if (fetchError) {
    console.error('Erro ao buscar pendentes:', fetchError)
    return NextResponse.json({ error: 'Erro ao buscar pendentes' }, { status: 500 })
  }

  if (!overdue || overdue.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const ids = overdue.map(f => f.id)

  const { error: updateError } = await updateStatusByIds(supabase, ids, 'overdue')

  if (updateError) {
    console.error('Erro ao atualizar status:', updateError)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.error('Erro ao listar usuários auth:', usersError)
  }
  const emailMap = new Map(users?.map(u => [u.id, u.email]) ?? [])

  const academyIds = Array.from(new Set(overdue.map(f => f.academy_id).filter(Boolean)))

  const { data: academiesData } = await supabase
    .from('academies')
    .select('id, name')
    .in('id', academyIds)

  const academyNameMap = new Map(academiesData?.map(a => [a.id, a.name]) ?? [])

  for (const record of overdue) {
    const profileObj = Array.isArray(record.profiles) ? record.profiles[0] : record.profiles
    const profile = profileObj as unknown as { full_name: string } | null
    if (!profile) continue

    const studentEmail = emailMap.get(record.student_id)
    if (!studentEmail) {
      console.warn(`Email não encontrado para student_id: ${record.student_id}`)
      continue
    }

    const [y, m, d] = record.due_date.split('-')
    const formattedDate = `${d}/${m}/${y}`
    const academyName = academyNameMap.get(record.academy_id) ?? 'sua academia'

    sendOverdueAlert(
      studentEmail,
      profile.full_name,
      record.amount,
      formattedDate,
      academyName,
    ).catch(err => console.error(`Falha no email atraso ${record.id}:`, err))
  }

  return NextResponse.json({ updated: ids.length })
}
