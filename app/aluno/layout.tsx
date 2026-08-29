import React from 'react'
import { AlunoPortalFrame } from '@/components/aluno/aluno-portal-frame'
import { Logo } from '@/components/logo'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { createClient, createStorageAdminClient } from '@/lib/supabase/server'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let sports: string[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('sport')
      .eq('id', user.id)
      .single()

    const storageAdmin = createStorageAdminClient()
    const { data: studentSports } = await storageAdmin
      .from('student_sports')
      .select('sport')
      .eq('student_id', user.id)

    sports = studentSports?.map(s => s.sport) ??
      (profile?.sport ? [profile.sport] : [])
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Logo className="h-7 w-auto" variant="full" />
          <LogoutButton
            showText={false}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-red-500 transition-colors"
          />
        </div>
      </header>

      <AlunoPortalFrame sports={sports}>
        {children}
      </AlunoPortalFrame>
    </div>
  )
}
