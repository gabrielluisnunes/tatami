import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react'
import { OverdueTable } from '@/components/dashboard/overdue-table'
import { MonthlyTable } from '@/components/dashboard/monthly-table'

export default async function FinanceiroPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'admin') redirect('/dashboard')

  const academyId = profile.academy_id

  // ── Totais via view ──────────────────────────────────────────────────────────
  const { data: summary } = await supabase
    .from('v_financial_dashboard')
    .select('paid_total, overdue_total, overdue_count, pending_count')
    .eq('academy_id', academyId)
    .single()

  const { count: totalStudents } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('role', 'aluno')

  const paidTotal    = summary?.paid_total    ?? 0
  const overdueTotal = summary?.overdue_total ?? 0
  const overdueCount = summary?.overdue_count ?? 0
  const inadimplencia = totalStudents
    ? ((overdueCount / totalStudents) * 100).toFixed(1)
    : '0.0'

  interface OverdueRaw {
    id: string
    amount: number
    due_date: string
    student_id: string
    profiles: {
      full_name: string
    } | null
  }

  // ── Alunos em atraso ─────────────────────────────────────────────────────────
  const { data: overdueRaw } = await supabase
    .from('financials')
    .select('id, amount, due_date, student_id, profiles!inner(full_name)')
    .eq('academy_id', academyId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true })

  const overdueRecords = ((overdueRaw as unknown as OverdueRaw[]) ?? []).map((f) => ({
    id:         f.id,
    student_id: f.student_id,
    full_name:  f.profiles?.full_name || '—',
    amount:     f.amount,
    due_date:   f.due_date,
  }))

  // ── Mensalidades do mês atual (Cálculo independente de fuso horário) ──────────
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstOfMonth = `${year}-${pad(month)}-01`
  const lastOfMonth = `${year}-${pad(month)}-31`

  // Buscar todos os alunos da academia
  const { data: allStudents } = await supabase
    .from('profiles')
    .select('id, full_name, payment_due_day')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  // Buscar cobranças do mês atual para essa academia
  const { data: monthlyCharges } = await supabase
    .from('financials')
    .select('id, student_id, amount, due_date, paid_at, status')
    .eq('academy_id', profile.academy_id)
    .gte('due_date', firstOfMonth)
    .lte('due_date', lastOfMonth)

  // Combinar: para cada aluno, verificar se tem cobrança no mês
  const monthlyRecords = (allStudents ?? []).map(student => {
    const charge = (monthlyCharges ?? []).find(c => c.student_id === student.id)
    return {
      id: charge?.id ?? null,
      student_id: student.id,
      full_name: student.full_name,
      payment_due_day: student.payment_due_day,
      amount: charge?.amount ?? null,
      due_date: charge?.due_date ?? null,
      paid_at: charge?.paid_at ?? null,
      status: charge?.status ?? 'pending',
      has_charge: !!charge,
    }
  })

  // ── Dados da academia (monthly_price) ─────────────────────────────────────────
  const { data: academyData } = await supabase
    .from('academies')
    .select('monthly_price')
    .eq('id', profile.academy_id)
    .single()

  const monthlyPrice = academyData?.monthly_price ?? 0

  const metrics = [
    {
      title: 'Total recebido',
      value: paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon:  TrendingUp,
      color: 'text-emerald-400',
    },
    {
      title: 'Total em atraso',
      value: overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon:  TrendingDown,
      color: 'text-red-400',
    },
    {
      title: 'Inadimplentes',
      value: `${overdueCount} aluno${overdueCount !== 1 ? 's' : ''}`,
      icon:  AlertTriangle,
      color: 'text-amber-400',
    },
    {
      title: '% Inadimplência',
      value: `${inadimplencia}%`,
      icon:  DollarSign,
      color: inadimplencia === '0.0' ? 'text-emerald-400' : 'text-amber-400',
    },
  ]

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Financeiro</h1>
        <p className="text-sm text-gray-400 capitalize">{monthName}</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(m => (
          <Card key={m.title} className="border-gray-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-gray-500">{m.title}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alunos em atraso */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Alunos em atraso</h2>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-950/50 px-2 py-0.5 text-xs font-medium text-red-400">
              {overdueCount}
            </span>
          )}
        </div>
        <OverdueTable records={overdueRecords} />
      </div>

      {/* Mensalidades do mês */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Mensalidades — {now.toLocaleDateString('pt-BR', { month: 'long' })}
        </h2>
        <MonthlyTable records={monthlyRecords} monthlyPrice={monthlyPrice} />
      </div>
    </div>
  )
}
