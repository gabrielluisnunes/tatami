import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DollarSign, AlertTriangle, TrendingDown, TrendingUp, Download } from 'lucide-react'
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
    profiles: { full_name: string } | null
  }

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

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstOfMonth = `${year}-${pad(month)}-01`
  const lastOfMonth  = `${year}-${pad(month)}-31`

  const { data: allStudents } = await supabase
    .from('profiles')
    .select('id, full_name, payment_due_day')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  const { data: monthlyCharges } = await supabase
    .from('financials')
    .select('id, student_id, amount, due_date, paid_at, status')
    .eq('academy_id', profile.academy_id)
    .gte('due_date', firstOfMonth)
    .lte('due_date', lastOfMonth)

  const monthlyRecords = (allStudents ?? []).map(student => {
    const charge = (monthlyCharges ?? []).find(c => c.student_id === student.id)
    return {
      id:              charge?.id ?? null,
      student_id:      student.id,
      full_name:       student.full_name,
      payment_due_day: student.payment_due_day,
      amount:          charge?.amount ?? null,
      due_date:        charge?.due_date ?? null,
      paid_at:         charge?.paid_at ?? null,
      status:          charge?.status ?? 'pending',
      has_charge:      !!charge,
    }
  })

  const { data: academyData } = await supabase
    .from('academies')
    .select('monthly_price')
    .eq('id', profile.academy_id)
    .single()

  const monthlyPrice = academyData?.monthly_price ?? 0

  const metrics = [
    {
      title: 'TOTAL RECEBIDO',
      value: paidTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      accentColor: 'border-l-emerald-500',
    },
    {
      title: 'TOTAL EM ATRASO',
      value: overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: TrendingDown,
      iconColor: 'text-red-500',
      accentColor: 'border-l-red-500',
    },
    {
      title: 'INADIMPLENTES',
      value: `${overdueCount} aluno${overdueCount !== 1 ? 's' : ''}`,
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      accentColor: 'border-l-amber-500',
    },
    {
      title: '% INADIMPLÊNCIA',
      value: `${inadimplencia}%`,
      icon: DollarSign,
      iconColor: inadimplencia === '0.0' ? 'text-emerald-500' : 'text-amber-500',
      accentColor: inadimplencia === '0.0' ? 'border-l-emerald-500' : 'border-l-amber-500',
    },
  ]

  const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Financeiro</h1>
          <p className="text-sm text-zinc-500 mt-0.5 capitalize">{monthName}</p>
        </div>
        <a
          href="/api/reports/inadimplencia"
          download
          className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar inadimplentes
        </a>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map(m => (
          <div
            key={m.title}
            className={`bg-white rounded-xl border border-zinc-200 border-l-[3px] ${m.accentColor} p-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{m.title}</p>
              <m.icon className={`h-4 w-4 ${m.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Alunos em atraso */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Alunos em atraso</h2>
          {overdueCount > 0 && (
            <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
              {overdueCount}
            </span>
          )}
        </div>
        <OverdueTable records={overdueRecords} />
      </div>

      {/* Mensalidades do mês */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Mensalidades — {now.toLocaleDateString('pt-BR', { month: 'long' })}
        </h2>
        <MonthlyTable records={monthlyRecords} monthlyPrice={monthlyPrice} />
      </div>
    </div>
  )
}
