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

  // Buscar cobranças em atraso com dados do aluno
  const { data: overdue } = await supabase
    .from('financials')
    .select(`
      id,
      amount,
      due_date,
      status,
      profiles!inner ( full_name )
    `)
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

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const rows = overdue.map(f => {
    const dueDate = new Date(f.due_date + 'T00:00:00')
    const daysLate = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const profile = (Array.isArray(f.profiles) ? f.profiles[0] : f.profiles) as { full_name: string } | null

    return {
      'Nome do aluno': profile?.full_name ?? '—',
      'Valor (R$)': Number(f.amount).toFixed(2).replace('.', ','),
      'Vencimento': new Date(f.due_date + 'T00:00:00').toLocaleDateString('pt-BR'),
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
