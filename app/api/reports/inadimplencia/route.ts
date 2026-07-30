import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  const supabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Buscar cobranças em atraso
  const { data: overdue } = await supabase
    .from('financials')
    .select('id, student_id, amount, due_date, status')
    .eq('academy_id', profile.academy_id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  if (!overdue || overdue.length === 0) {
    // Retornar Excel vazio com mensagem
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet([{ 
      'Situação': 'Nenhum aluno inadimplente no momento' 
    }])
    XLSX.utils.book_append_sheet(wb, ws, 'Inadimplência')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const today = new Date().toISOString().split('T')[0]
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inadimplencia-${today}.xlsx"`,
      },
    })
  }

  // Buscar nomes dos alunos separadamente
  const studentIds = Array.from(new Set((overdue ?? []).map(f => f.student_id)))

  const { data: studentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)

  const studentNameMap = new Map(
    (studentsData ?? []).map(s => [s.id, s.full_name])
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = (overdue ?? []).map(f => {
    const dueDate = new Date(f.due_date + 'T00:00:00')
    const daysLate = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const studentName = studentNameMap.get(f.student_id) ?? '—'

    return {
      'Nome do aluno': studentName,
      'Valor (R$)': Number(f.amount).toFixed(2).replace('.', ','),
      'Vencimento': dueDate.toLocaleDateString('pt-BR'),
      'Dias em atraso': daysLate,
      'Status': 'Em atraso',
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 12 }, // Valor
    { wch: 14 }, // Vencimento
    { wch: 15 }, // Dias em atraso
    { wch: 12 }, // Status
  ]

  const dateLabel = today.toLocaleDateString('pt-BR')
  XLSX.utils.book_append_sheet(wb, ws, `Inadimplência ${dateLabel}`)

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const todayStr = today.toISOString().split('T')[0]

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inadimplencia-${todayStr}.xlsx"`,
    },
  })
}
