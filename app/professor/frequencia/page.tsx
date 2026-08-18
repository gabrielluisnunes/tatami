import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Camera } from 'lucide-react'
import Link from 'next/link'
import { SPORT_LABELS } from '@/lib/professor-sports'

interface CheckinRecord {
  id: string
  checked_in_at: string
  status: 'pending' | 'confirmed'
  classes: { name: string; sport?: string | null } | null
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

  // createStorageAdminClient() para ler checkins — bypassa RLS
  const adminSupabase = createStorageAdminClient()

  const { data: rawCheckins } = await adminSupabase
    .from('checkins')
    .select('id, checked_in_at, status, classes ( name, sport )')
    .eq('professor_id', user.id)
    .eq('academy_id', profile.academy_id)
    .order('checked_in_at', { ascending: false })
    .limit(30)

  const checkinIds = (rawCheckins ?? []).map(c => c.id as string)

  const { data: rawAttendance } = checkinIds.length
    ? await adminSupabase
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
    class_sport:   c.classes?.sport ?? null,
    status:        c.status,
    count:         countMap.get(c.id) ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Frequência</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Últimos 30 check-ins das suas turmas</p>
      </div>

      {checkins.length > 0 ? (
        <div className="space-y-2">
          {checkins.map(c => {
            const date = new Date(c.checked_in_at)
            return (
              <div key={c.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{c.class_name}</p>
                    {c.class_sport && (
                      <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {SPORT_LABELS[c.class_sport] ?? c.class_sport}
                      </span>
                    )}
                  </div>
                  {c.status === 'confirmed' ? (
                    <span className="text-xs font-medium text-emerald-700">Confirmado</span>
                  ) : (
                    <Link
                      href={`/professor/checkin/${c.id}`}
                      className="text-xs font-medium text-amber-600 underline-offset-2 hover:underline transition-colors"
                    >
                      Pendente
                    </Link>
                  )}
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <Camera className="h-6 w-6 mb-2 text-zinc-400" />
          <p className="text-sm text-zinc-500">Nenhum check-in registrado ainda.</p>
        </div>
      )}
    </div>
  )
}
