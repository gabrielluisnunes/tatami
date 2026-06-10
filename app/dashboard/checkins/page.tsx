import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckinsList } from '@/components/dashboard/checkins-list'

interface CheckinRecord {
  id: string
  checked_in_at: string
  status: 'pending' | 'confirmed'
  classes: {
    name: string
  } | null
  profiles: {
    full_name: string
  } | null
}

interface AttendanceRecord {
  checkin_id: string
  student_id: string
  source: 'ai' | 'manual'
  profiles: {
    full_name: string
  } | null
}

export default async function CheckinsPage() {
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

  // Últimos 30 checkins com joins
  const { data: rawCheckins } = await supabase
    .from('checkins')
    .select(`
      id,
      checked_in_at,
      status,
      classes ( name ),
      profiles!checkins_professor_id_fkey ( full_name )
    `)
    .eq('academy_id', academyId)
    .order('checked_in_at', { ascending: false })
    .limit(30)

  const checkinIds = (rawCheckins ?? []).map((c) => c.id as string)

  // Busca toda a attendance dos 30 checkins de uma vez (evita N+1)
  const { data: rawAttendance } = checkinIds.length
    ? await supabase
        .from('attendance')
        .select('checkin_id, student_id, source, profiles!attendance_student_id_fkey(full_name)')
        .in('checkin_id', checkinIds)
    : { data: [] }

  // Agrupa attendance por checkin_id
  const attendanceMap = new Map<string, { student_id: string; full_name: string; source: 'ai' | 'manual' }[]>()
  for (const a of (rawAttendance as unknown as AttendanceRecord[]) ?? []) {
    const entry = {
      student_id: a.student_id,
      full_name:  a.profiles?.full_name || 'Desconhecido',
      source:     a.source,
    }
    const list = attendanceMap.get(a.checkin_id) ?? []
    list.push(entry)
    attendanceMap.set(a.checkin_id, list)
  }

  const checkins = ((rawCheckins as unknown as CheckinRecord[]) ?? []).map(c => ({
    id:             c.id,
    checked_in_at:  c.checked_in_at,
    class_name:     c.classes?.name || '—',
    professor_name: c.profiles?.full_name || '—',
    status:         c.status,
    attendance:     attendanceMap.get(c.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Check-ins</h1>
        <p className="text-sm text-zinc-500">Últimos 30 registros de presença</p>
      </div>
      <CheckinsList checkins={checkins} />
    </div>
  )
}
