import React from 'react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { ProfessorNav } from '@/components/professor/professor-nav'

export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-600/10 p-1.5 ring-1 ring-indigo-500/20">
              <svg className="h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">Tatami</span>
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
