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

  // Birthdays of current month
  const currentMonth = new Date().getMonth() + 1

  const { data: birthdaysRaw } = await supabase
    .from('profiles')
    .select('id, full_name, birth_date, photo_url, belt, degree')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .not('birth_date', 'is', null)

  const birthdays = (birthdaysRaw ?? [])
    .filter(a => {
      if (!a.birth_date) return false
      const month = new Date(a.birth_date + 'T00:00:00').getMonth() + 1
      return month === currentMonth
    })
    .sort((a, b) => {
      const dayA = new Date(a.birth_date! + 'T00:00:00').getDate()
      const dayB = new Date(b.birth_date! + 'T00:00:00').getDate()
      return dayA - dayB
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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Olá, {profile.full_name || 'Admin'}
        </h1>
        <p className="text-sm text-gray-500">{academy?.name ?? 'Sua academia'}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.title} className="bg-white border-gray-200">
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

      {/* Widget de aniversariantes */}
      {birthdays.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎂</span>
            <h2 className="text-base font-semibold text-gray-900">
              Aniversariantes do mês
            </h2>
            <span className="ml-auto rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {birthdays.length} aluno{birthdays.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            {birthdays.map(aluno => {
              const day = new Date(aluno.birth_date! + 'T00:00:00').getDate()
              const isToday = new Date(aluno.birth_date! + 'T00:00:00').getDate() === new Date().getDate()
              return (
                <div
                  key={aluno.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                    isToday 
                      ? 'border-amber-200 bg-amber-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700">
                    {day}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      isToday ? 'text-amber-800' : 'text-gray-800'
                    }`}>
                      {aluno.full_name.split(' ')[0]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isToday ? '🎉 Hoje!' : `dia ${day}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent check-ins */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Últimos check-ins</h2>
        {recentCheckins && recentCheckins.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Turma</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Presentes</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.map((checkin) => (
                  <tr key={checkin.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-700">
                      {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {classMap.get(checkin.class_id) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
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
          <p className="text-sm text-gray-400">Nenhum check-in registrado ainda.</p>
        )}
      </div>
    </div>
  )
}
