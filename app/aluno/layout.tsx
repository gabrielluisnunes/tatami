import React from 'react'
import { AlunoNav } from '@/components/aluno/aluno-nav'
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
      <main>
        {children}
      </main>
      <AlunoNav sport={sport} />
    </div>
  )
}
