import React from 'react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { AlunoNav } from '@/components/aluno/aluno-nav'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/server'

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let sport: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('sport')
      .eq('id', user.id)
      .single()
    sport = profile?.sport ?? null
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" variant="icon" />
            <span className="text-base font-black tracking-[0.2em] text-zinc-50">TΛTΛMI</span>
          </div>
          <LogoutButton showText={false} />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="mx-auto max-w-lg px-4 pb-24 pt-6">
        {children}
      </main>

      {/* Bottom nav */}
      <AlunoNav sport={sport} />
    </div>
  )
}
