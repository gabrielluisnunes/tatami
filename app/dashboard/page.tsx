import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch admin profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) {
    redirect('/onboarding')
  }

  const academyId = profile.academy_id

  // Fetch academy name
  const { data: academy } = await supabase
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single()

  // Count active students
  const { count: totalAlunos } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('role', 'aluno')

  // Financial metrics from the current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  const { count: pagasNoMes } = await supabase
    .from('financials')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('status', 'paid')
    .gte('due_date', firstOfMonth)
    .lte('due_date', lastOfMonth)

  const { data: overdueData } = await supabase
    .from('financials')
    .select('id, amount')
    .eq('academy_id', academyId)
    .eq('status', 'overdue')

  const inadimplentes = overdueData?.length ?? 0
  const valorEmAtraso = overdueData?.reduce((sum, f) => sum + (f.amount || 0), 0) ?? 0

  // Last 5 checkins
  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select('id, checked_in_at, class_id, status')
    .eq('academy_id', academyId)
    .order('checked_in_at', { ascending: false })
    .limit(5)

  // Get attendance count for each checkin
  const checkinIds = recentCheckins?.map((c) => c.id) ?? []
  const { data: attendanceCounts } = checkinIds.length
    ? await supabase
      .from('attendance')
      .select('checkin_id')
      .in('checkin_id', checkinIds)
    : { data: [] }

  // Get class names
  const classIds = Array.from(new Set(recentCheckins?.map((c) => c.class_id).filter(Boolean) ?? []))
  const { data: classes } = classIds.length
    ? await supabase
      .from('classes')
      .select('id, name')
      .in('id', classIds)
    : { data: [] }

  const classMap = new Map(classes?.map((c) => [c.id, c.name]) ?? [])
  const attendanceMap = new Map<string, number>()
  attendanceCounts?.forEach((a) => {
    attendanceMap.set(a.checkin_id, (attendanceMap.get(a.checkin_id) ?? 0) + 1)
  })

  const metrics = [
    { title: 'Total de alunos', value: totalAlunos ?? 0, icon: Users, color: 'text-indigo-400' },
    { title: 'Pagas no mês', value: pagasNoMes ?? 0, icon: DollarSign, color: 'text-emerald-400' },
    { title: 'Inadimplentes', value: inadimplentes, icon: AlertTriangle, color: 'text-amber-400' },
    {
      title: 'Valor em atraso',
      value: `R$ ${valorEmAtraso.toFixed(2)}`,
      icon: TrendingDown,
      color: 'text-red-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          Olá, {profile.full_name || 'Admin'}
        </h1>
        <p className="text-sm text-zinc-500">{academy?.name ?? 'Sua academia'}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.title} className="bg-zinc-900/60 border-zinc-800/80">
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

      {/* Recent check-ins */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-200">Últimos check-ins</h2>
        {recentCheckins && recentCheckins.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Turma</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Presentes</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.map((checkin) => (
                  <tr key={checkin.id} className="border-b border-zinc-800/40 last:border-0">
                    <td className="px-4 py-3 text-zinc-300">
                      {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {classMap.get(checkin.class_id) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {attendanceMap.get(checkin.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${checkin.status === 'confirmed'
                            ? 'bg-emerald-950/50 text-emerald-400'
                            : 'bg-amber-950/50 text-amber-400'
                          }`}
                      >
                        {checkin.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum check-in registrado ainda.</p>
        )}
      </div>
    </div>
  )
}
