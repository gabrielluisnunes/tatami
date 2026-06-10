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
  const now          = new Date()
  const year         = now.getFullYear()
  const month        = String(now.getMonth() + 1).padStart(2, '0')
  const firstOfMonth = `${year}-${month}-01`
  
  const lastDay      = new Date(year, now.getMonth() + 1, 0).getDate()
  const lastOfMonth  = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

  const { data: monthlyRaw } = await supabase
    .from('financials')
    .select('id, amount, due_date, paid_at, status, profiles!inner(full_name)')
    .eq('academy_id', academyId)
    .gte('due_date', firstOfMonth)
    .lte('due_date', lastOfMonth)
    .order('status')
    .order('due_date')

  interface MonthlyRaw {
    id: string
    amount: number
    due_date: string
    paid_at: string | null
    status: string
    profiles: {
      full_name: string
    } | null
  }

  const monthlyRecords = ((monthlyRaw as unknown as MonthlyRaw[]) ?? []).map((f) => ({
    id:        f.id,
    full_name: f.profiles?.full_name || '—',
    amount:    f.amount,
    due_date:  f.due_date,
    paid_at:   f.paid_at,
    status:    f.status as 'pending' | 'paid' | 'overdue',
  }))

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
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Financeiro</h1>
        <p className="text-sm text-zinc-500 capitalize">{monthName}</p>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(m => (
          <Card key={m.title} className="border-zinc-800/80 bg-zinc-900/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400">{m.title}</CardTitle>
              <m.icon className={`h-4 w-4 ${m.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{m.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alunos em atraso */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-200">Alunos em atraso</h2>
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
        <h2 className="text-lg font-semibold text-zinc-200">
          Mensalidades — {now.toLocaleDateString('pt-BR', { month: 'long' })}
        </h2>
        <MonthlyTable records={monthlyRecords} />
      </div>
    </div>
  )
}
