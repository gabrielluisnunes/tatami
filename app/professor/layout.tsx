import React from 'react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { ProfessorNav } from '@/components/professor/professor-nav'
import { Logo } from '@/components/logo'

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo className="h-6 w-6" variant="icon" />
            <span className="text-base font-black tracking-[0.2em] text-zinc-50">TΛTΛMI</span>
          </div>
          <LogoutButton showText={false} />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24">
        {children}
      </main>

      <ProfessorNav />
    </div>
  )
}
