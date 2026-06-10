import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NovaTurmaForm } from '@/components/dashboard/nova-turma-form'
import { TurmaActions } from '@/components/dashboard/turma-actions'
import { Calendar } from 'lucide-react'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatWeekdays(days: number[]): string {
  return [...days].sort((a, b) => a - b).map(d => WEEKDAY_LABELS[d]).join(', ')
}

interface ClassRecord {
  id: string
  name: string
  start_time: string
  end_time: string
  weekdays: number[]
  professor_id: string
  profiles: {
    full_name: string
  } | null
}

interface ProfessorRecord {
  id: string
  full_name: string
}

export default async function TurmasPage() {
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

  const { data: rawClasses } = await supabase
    .from('classes')
    .select('id, name, start_time, end_time, weekdays, professor_id, profiles!classes_professor_id_fkey(full_name)')
    .eq('academy_id', academyId)
    .order('start_time', { ascending: true })

  const classes = ((rawClasses as unknown as ClassRecord[]) ?? []).map(c => ({
    id:             c.id,
    name:           c.name,
    start_time:     c.start_time ? c.start_time.slice(0, 5) : '',
    end_time:       c.end_time ? c.end_time.slice(0, 5) : '',
    weekdays:       c.weekdays,
    professor_id:   c.professor_id,
    professor_name: c.profiles?.full_name || '—',
  }))

  const { data: rawProfessors } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('academy_id', academyId)
    .in('role', ['professor', 'admin'])
    .order('full_name')

  const professors = ((rawProfessors as unknown as ProfessorRecord[]) ?? []).map(p => ({
    id:        p.id,
    full_name: p.full_name,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Turmas</h1>
          <p className="text-sm text-zinc-500">
            {classes.length} turma{classes.length !== 1 ? 's' : ''} cadastrada{classes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NovaTurmaForm professors={professors} />
      </div>

      {/* Listagem */}
      {classes.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Professor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Dias</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Horário</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400"></th>
              </tr>
            </thead>
            <tbody>
              {classes.map(cls => (
                <tr key={cls.id} className="border-b border-zinc-800/40 last:border-0">
                  <td className="px-4 py-3 font-medium text-zinc-200">{cls.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{cls.professor_name}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {cls.weekdays.length > 0 ? formatWeekdays(cls.weekdays) : '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {cls.start_time} – {cls.end_time}
                  </td>
                  <td className="px-4 py-3">
                    <TurmaActions turma={cls} professors={professors} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Calendar className="h-8 w-8 mb-3 text-zinc-700" />
          <p className="text-zinc-500 text-sm">Nenhuma turma cadastrada ainda.</p>
        </div>
      )}
    </div>
  )
}
