'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AlunoNav } from '@/components/aluno/aluno-nav'
import { cn } from '@/lib/utils'

interface AlunoPortalFrameProps {
  sports: string[]
  children: ReactNode
}

export function AlunoPortalFrame({ sports, children }: AlunoPortalFrameProps) {
  const pathname = usePathname()
  const hideNav = pathname === '/aluno/completar-perfil'

  return (
    <>
      <main className={cn('mx-auto max-w-lg px-4 pt-6', hideNav ? 'pb-6' : 'pb-24')}>
        {children}
      </main>
      {!hideNav && <AlunoNav sports={sports} />}
    </>
  )
}
