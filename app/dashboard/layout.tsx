import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, academy_id')
    .eq('id', user.id)
    .single()

  let academyName = ''

  if (profile?.academy_id) {
    const adminSupabase = createAdminClient()
    const { data: academy } = await adminSupabase
      .from('academies')
      .select('name')
      .eq('id', profile.academy_id)
      .single()

    if (academy?.name) {
      academyName = academy.name
    }
  }

  return (
    <DashboardShell
      academyName={academyName}
      adminName={profile?.full_name || 'Admin'}
    >
      {children}
    </DashboardShell>
  )
}
