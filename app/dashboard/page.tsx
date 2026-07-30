import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, DollarSign, AlertTriangle, TrendingDown } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) {
    redirect('/onboarding')
  }

  const academyId = profile.academy_id

  const { data: academy } = await supabase
    .from('academies')
    .select('name')
    .eq('id', academyId)
    .single()

  const { count: totalAlunos } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('academy_id', academyId)
    .eq('role', 'aluno')

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

  const { data: recentCheckins } = await supabase
    .from('checkins')
    .select('id, checked_in_at, class_id, status')
    .eq('academy_id', academyId)
    .order('checked_in_at', { ascending: false })
    .limit(5)

  const checkinIds = recentCheckins?.map((c) => c.id) ?? []
  const { data: attendanceCounts } = checkinIds.length
    ? await supabase
      .from('attendance')
      .select('checkin_id')
      .in('checkin_id', checkinIds)
    : { data: [] }

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

  const currentMonth = now.getMonth() + 1

  const { data: birthdaysRaw } = await supabase
    .from('profiles')
    .select('id, full_name, birth_date, photo_url, belt, degree')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .not('birth_date', 'is', null)

  const birthdays = (birthdaysRaw ?? [])
    .filter(a => {
      if (!a.birth_date) return false
      return new Date(a.birth_date + 'T00:00:00').getMonth() + 1 === currentMonth
    })
    .sort((a, b) => {
      return new Date(a.birth_date! + 'T00:00:00').getDate()
           - new Date(b.birth_date! + 'T00:00:00').getDate()
    })

  const metrics = [
    {
      title: 'TOTAL DE ALUNOS',
      value: totalAlunos ?? 0,
      icon: Users,
      iconColor: 'text-zinc-400',
      accentColor: 'border-l-zinc-400',
    },
    {
      title: 'PAGAS NO MÊS',
      value: pagasNoMes ?? 0,
      icon: DollarSign,
      iconColor: 'text-emerald-500',
      accentColor: 'border-l-emerald-500',
    },
    {
      title: 'INADIMPLENTES',
      value: inadimplentes,
      icon: AlertTriangle,
      iconColor: 'text-amber-500',
      accentColor: 'border-l-amber-500',
    },
    {
      title: 'VALOR EM ATRASO',
      value: `R$ ${valorEmAtraso.toFixed(2)}`,
      icon: TrendingDown,
      iconColor: 'text-red-500',
      accentColor: 'border-l-red-500',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Olá, {profile.full_name || 'Admin'}
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">{academy?.name ?? 'Sua academia'}</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
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

      {/* Widget de aniversariantes */}
      {birthdays.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">🎂</span>
            <h2 className="text-sm font-semibold text-zinc-900">
              Aniversariantes do mês
            </h2>
            <span className="ml-auto rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {birthdays.length} aluno{birthdays.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {birthdays.map(aluno => {
              const day = new Date(aluno.birth_date! + 'T00:00:00').getDate()
              const isToday = day === now.getDate()
              return (
                <div
                  key={aluno.id}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                    isToday
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-zinc-200 bg-zinc-50'
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-zinc-200 text-sm font-bold text-zinc-700">
                    {day}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isToday ? 'text-amber-800' : 'text-zinc-800'}`}>
                      {aluno.full_name.split(' ')[0]}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {isToday ? '🎉 Hoje!' : `dia ${day}`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Últimos check-ins */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Últimos check-ins</h2>
        {recentCheckins && recentCheckins.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Turma</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Presentes</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.map((checkin) => (
                  <tr key={checkin.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-700">
                      {new Date(checkin.checked_in_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {classMap.get(checkin.class_id) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {attendanceMap.get(checkin.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        checkin.status === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {checkin.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Nenhum check-in registrado ainda.</p>
        )}
      </div>
    </div>
  )
}
