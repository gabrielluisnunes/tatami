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
  const { data: overdue, error: overdueError } = await supabase
    .from('financials')
    .select('id, student_id, amount, due_date, status')
    .eq('academy_id', profile.academy_id)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  if (overdueError) {
    console.error('Erro ao buscar financials overdue:', overdueError)
    return NextResponse.json({ error: overdueError.message }, { status: 500 })
  }

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
  const studentIds = Array.from(new Set(overdue.map(f => f.student_id).filter(Boolean)))

  let studentsData: { id: string; full_name: string | null }[] = []

  if (studentIds.length > 0) {
    const { data, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)

    if (studentsError) {
      console.error('Erro ao buscar profiles:', studentsError)
      return NextResponse.json({ error: studentsError.message }, { status: 500 })
    }
    studentsData = data || []
  }

  const studentNameMap = new Map(
    studentsData.map(s => [s.id, s.full_name])
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

  const dateLabel = today.toLocaleDateString('pt-BR').replace(/\//g, '-')
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
