import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar } from 'lucide-react'

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
    .select('id, name, weekdays, start_time, end_time')
    .eq('professor_id', user.id)
    .eq('academy_id', profile.academy_id)
    .order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Minhas turmas</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {classes?.length ?? 0} turma{(classes?.length ?? 0) !== 1 ? 's' : ''} designada{(classes?.length ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      {classes && classes.length > 0 ? (
        <div className="space-y-2">
          {classes.map(cls => (
            <div
              key={cls.id}
              className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{cls.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {cls.weekdays?.length > 0 ? formatWeekdays(cls.weekdays) : '—'}
                  </p>
                </div>
                <span className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300">
                  {cls.start_time} – {cls.end_time}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Calendar className="h-6 w-6 mb-2 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhuma turma designada ainda.</p>
          <p className="text-xs text-zinc-600 mt-1">O administrador pode designar turmas no dashboard.</p>
        </div>
      )}
    </div>
  )
}
