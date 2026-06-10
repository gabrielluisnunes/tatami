import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Camera } from 'lucide-react'

interface CheckinRecord {
  id: string
  checked_in_at: string
  status: 'pending' | 'confirmed'
  classes: { name: string } | null
}

export default async function ProfessorFrequenciaPage() {
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

  // Checkins do professor diretamente por professor_id
  const { data: rawCheckins } = await supabase
    .from('checkins')
    .select('id, checked_in_at, status, classes ( name )')
    .eq('professor_id', user.id)
    .order('checked_in_at', { ascending: false })
    .limit(30)

  const checkinIds = (rawCheckins ?? []).map(c => c.id as string)

  // Contagem de presenças por checkin (evita N+1)
  const { data: rawAttendance } = checkinIds.length
    ? await supabase
        .from('attendance')
        .select('checkin_id')
        .in('checkin_id', checkinIds)
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const a of rawAttendance ?? []) {
    countMap.set(a.checkin_id, (countMap.get(a.checkin_id) ?? 0) + 1)
  }

  const checkins = ((rawCheckins as unknown as CheckinRecord[]) ?? []).map(c => ({
    id:            c.id,
    checked_in_at: c.checked_in_at,
    class_name:    c.classes?.name || '—',
    status:        c.status,
    count:         countMap.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Frequência</h1>
        <p className="text-sm text-zinc-500 mt-1">Últimos 30 check-ins das suas turmas</p>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2">
          {checkins.map(c => {
            const date = new Date(c.checked_in_at)
            return (
              <div
                key={c.id}
                className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-200">{c.class_name}</p>
                  <span className={`text-xs font-medium ${
                    c.status === 'confirmed' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {c.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    {date.toLocaleDateString('pt-BR', {
                      weekday: 'long', day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {c.count} aluno{c.count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <Camera className="h-6 w-6 mb-2 text-zinc-700" />
          <p className="text-sm text-zinc-500">Nenhum check-in registrado ainda.</p>
        </div>
      )}
    </div>
  )
}
