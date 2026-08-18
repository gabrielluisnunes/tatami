import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { SPORT_LABELS } from '@/lib/professor-sports'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatWeekdays(days: number[]): string {
  return [...days].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(', ')
}

export default async function ProfessorTurmasPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/auth/login')
  if (profile.role !== 'professor' && profile.role !== 'admin') redirect('/auth/login')

  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, weekdays, start_time, end_time, sport')
    .eq('professor_id', user.id)
    .eq('academy_id', profile.academy_id)
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Minhas turmas</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {classes?.length ?? 0} turma{(classes?.length ?? 0) !== 1 ? 's' : ''} designada{(classes?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {classes && classes.length > 0 ? (
        <div className="space-y-2">
          {classes.map(cls => (
            <div
              key={cls.id}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{cls.name}</p>
                    {cls.sport && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {SPORT_LABELS[cls.sport] ?? cls.sport}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {cls.weekdays?.length > 0 ? formatWeekdays(cls.weekdays) : '—'}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {cls.start_time} – {cls.end_time}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Calendar className="h-6 w-6 mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-500">Nenhuma turma designada ainda.</p>
          <p className="text-xs text-zinc-500 mt-1">O administrador pode designar turmas no dashboard.</p>
        </div>
      )}
    </div>
  )
}
