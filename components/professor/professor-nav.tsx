'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, Users, Activity, Award, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/professor/checkin',    icon: Camera,    label: 'Check-in'   },
  { href: '/professor/alunos',     icon: Users,     label: 'Alunos'     },
  { href: '/professor/frequencia', icon: Activity,  label: 'Frequência' },
  { href: '/professor/graduacoes', icon: Award,     label: 'Graduações' },
  { href: '/professor/turmas',     icon: Calendar,  label: 'Turmas'     },
]

export function ProfessorNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <tab.icon className={cn('h-5 w-5 transition-colors', active ? 'text-zinc-900' : 'text-zinc-400')} />
              <span className={cn('text-[10px] transition-colors', active ? 'text-zinc-900 font-medium' : 'text-zinc-400')}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
