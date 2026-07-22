import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendDueTodayAlert } from '@/lib/notifications'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  const brasiliaOffset = -3 * 60 // -180 minutos
  const brasiliaTime = new Date(now.getTime() + brasiliaOffset * 60 * 1000)
  const todayDay = brasiliaTime.getUTCDate()
  const todayMonth = brasiliaTime.getUTCMonth() + 1
  const todayYear = brasiliaTime.getUTCFullYear()

  console.log(`[generate-monthly-charges] Data Brasília: ${brasiliaTime.toISOString()}, Dia: ${todayDay}, Mês: ${todayMonth}, Ano: ${todayYear}`)

  const pad = (n: number) => String(n).padStart(2, '0')
  const dueDateStr  = `${todayYear}-${pad(todayMonth)}-${pad(todayDay)}`
  const monthStart  = `${todayYear}-${pad(todayMonth)}-01`
  const monthEnd    = `${todayYear}-${pad(todayMonth)}-31`

  const { data: students, error: studentsError } = await supabase
    .from('profiles')
    .select('id, full_name, academy_id, payment_due_day')
    .eq('role', 'aluno')
    .eq('payment_due_day', todayDay)

  if (studentsError) {
    console.error('Erro ao buscar alunos:', studentsError)
    return NextResponse.json({ error: 'Erro ao buscar alunos' }, { status: 500 })
  }

  if (!students || students.length === 0) {
    return NextResponse.json({ created: 0 })
  }

  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    console.error('Erro ao listar usuários auth:', usersError)
  }
  const emailMap = new Map(users?.map(u => [u.id, u.email]) ?? [])

  const academyIds = Array.from(new Set(students.map(s => s.academy_id).filter(Boolean)))

  const { data: academies } = await supabase
    .from('academies')
    .select('id, name, monthly_price')
    .in('id', academyIds)

  const academyMap = new Map(academies?.map(a => [a.id, a]) ?? [])

  let created = 0

  for (const student of students) {
    const studentEmail = emailMap.get(student.id)
    if (!studentEmail) {
      console.warn(`Email não encontrado para student_id: ${student.id}`)
      continue
    }

    const academy = academyMap.get(student.academy_id)
    if (!academy) continue

    const { data: existing } = await supabase
      .from('financials')
      .select('id')
      .eq('student_id', student.id)
      .gte('due_date', monthStart)
      .lte('due_date', monthEnd)
      .limit(1)

    if (existing && existing.length > 0) continue

    const { error: insertError } = await supabase
      .from('financials')
      .insert({
        student_id: student.id,
        academy_id: student.academy_id,
        amount:     academy.monthly_price,
        due_date:   dueDateStr,
        status:     'pending',
      })

    if (insertError) {
      console.error(`Erro ao criar cobrança para ${student.id}:`, insertError)
      continue
    }

    created++

    sendDueTodayAlert(
      studentEmail,
      student.full_name,
      academy.monthly_price,
      dueDateStr,
      academy.name,
    ).catch(err => console.error(`Falha no email vencimento ${student.id}:`, err))
  }

  return NextResponse.json({ created })
}
