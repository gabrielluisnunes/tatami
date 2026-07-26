import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
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

  // Pegar mês do query param (formato YYYY-MM) ou usar mês atual
  const { searchParams } = new URL(request.url)
  const monthParam = searchParams.get('month')
  
  const today = new Date()
  const year = monthParam 
    ? parseInt(monthParam.split('-')[0]) 
    : today.getFullYear()
  const month = monthParam 
    ? parseInt(monthParam.split('-')[1]) 
    : today.getMonth() + 1
  
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstOfMonth = `${year}-${pad(month)}-01`
  const lastOfMonth = `${year}-${pad(month)}-31`
  const monthLabel = new Date(year, month - 1).toLocaleDateString('pt-BR', { 
    month: 'long', year: 'numeric' 
  })

  // 1. Buscar total de aulas confirmadas no mês
  const { count: totalClasses } = await supabase
    .from('checkins')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', profile.academy_id)
    .eq('status', 'confirmed')
    .gte('checked_in_at', firstOfMonth)
    .lte('checked_in_at', lastOfMonth)

  // 2. Buscar todos os alunos da academia
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, belt, degree')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  if (!students || students.length === 0) {
    return NextResponse.json({ error: 'Nenhum aluno encontrado' }, { status: 404 })
  }

  // 3. Para cada aluno, contar treinos no mês
  const beltLabels: Record<string, string> = {
    branca: 'Branca', azul: 'Azul', roxa: 'Roxa',
    marrom: 'Marrom', preta: 'Preta'
  }
  const degreeLabels = ['Sem grau', '1º grau', '2º grau', '3º grau', '4º grau']

  const rows = await Promise.all(
    students.map(async (student) => {
      const { count: trainings } = await supabase
        .from('attendance')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', student.id)
        .eq('academy_id', profile.academy_id)
        .gte('present_at', firstOfMonth)
        .lte('present_at', lastOfMonth)

      const trainingsCount = trainings ?? 0
      const totalClassesCount = totalClasses ?? 0
      const frequencyPct = totalClassesCount === 0
        ? null
        : Math.round((trainingsCount / totalClassesCount) * 1000) / 10

      return {
        'Nome': student.full_name,
        'Faixa': beltLabels[student.belt ?? 'branca'] ?? student.belt ?? '—',
        'Grau': degreeLabels[student.degree ?? 0] ?? 'Sem grau',
        'Treinos no mês': trainingsCount,
        'Total de aulas': totalClassesCount,
        'Frequência (%)': frequencyPct != null ? `${frequencyPct}%` : '—',
        'Status': frequencyPct == null 
          ? 'Sem dados'
          : frequencyPct >= 80 
            ? '✓ Regular' 
            : '⚠ Irregular',
      }
    })
  )

  // 4. Gerar arquivo Excel
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 30 }, // Nome
    { wch: 10 }, // Faixa
    { wch: 12 }, // Grau
    { wch: 15 }, // Treinos no mês
    { wch: 15 }, // Total de aulas
    { wch: 15 }, // Frequência
    { wch: 12 }, // Status
  ]

  XLSX.utils.book_append_sheet(wb, ws, `Frequência ${monthLabel}`)

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="frequencia-${year}-${pad(month)}.xlsx"`,
    },
  })
}
