import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import { CheckinsList } from '@/components/dashboard/checkins-list'
import { CheckinsFilter } from '@/components/dashboard/checkins-filter'

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

interface CheckinsPageProps {
  searchParams: {
    month?: string
  }
}

export default async function CheckinsPage({ searchParams }: CheckinsPageProps) {
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
  const selectedMonth = searchParams.month

  // Constrói a consulta de checkins do Supabase com base no filtro
  let query = supabase
    .from('checkins')
    .select(`
      id,
      checked_in_at,
      status,
      classes ( name ),
      profiles!checkins_professor_id_fkey ( full_name )
    `)
    .eq('academy_id', academyId)

  if (selectedMonth && selectedMonth !== 'all') {
    const startOfMonth = `${selectedMonth}-01T00:00:00.000Z`
    const [year, month] = selectedMonth.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endOfMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`

    query = query
      .gte('checked_in_at', startOfMonth)
      .lt('checked_in_at', endOfMonth)
  }

  // Se tem filtro de mês, aumentamos o limite para ver mais checkins do mês selecionado
  const limit = selectedMonth && selectedMonth !== 'all' ? 100 : 30

  const { data: rawCheckins } = await query
    .order('checked_in_at', { ascending: false })
    .limit(limit)

  const checkinIds = (rawCheckins ?? []).map((c) => c.id as string)

  // Busca toda a attendance dos checkins selecionados (evita N+1)
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

  const formatSelectedMonth = (monthString: string) => {
    try {
      const date = new Date(monthString + '-02')
      const formatted = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return formatted.charAt(0).toUpperCase() + formatted.slice(1)
    } catch {
      return monthString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Check-ins</h1>
          <p className="text-sm text-gray-500">
            {selectedMonth && selectedMonth !== 'all'
              ? `Registros de ${formatSelectedMonth(selectedMonth)}`
              : 'Últimos 30 registros de presença'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CheckinsFilter />
          <Link
            href="/professor/checkin"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Camera className="h-4 w-4" />
            Fazer check-in
          </Link>
        </div>
      </div>
      <CheckinsList checkins={checkins} />
    </div>
  )
}
