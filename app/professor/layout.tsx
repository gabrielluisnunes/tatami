import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { ProfessorNav } from '@/components/professor/professor-nav'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/server'

export default async function ProfessorLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Logo className="h-7 w-auto" variant="full" />
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Painel Admin
              </Link>
            )}
            <LogoutButton
              showText={false}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-red-500 transition-colors"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        {children}
      </main>

      <ProfessorNav />
    </div>
  )
}
