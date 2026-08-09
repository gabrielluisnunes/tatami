'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Award, DollarSign, FileText, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/aluno/frequencia', icon: Home,        label: 'Início'     },
  { href: '/aluno/graduacoes', icon: Award,       label: 'Graduações' },
  { href: '/aluno/financeiro', icon: DollarSign,  label: 'Financeiro' },
  { href: '/aluno/contratos',  icon: FileText,    label: 'Contratos'  },
  { href: '/aluno/perfil',     icon: UserCircle,  label: 'Perfil'     },
]

export function AlunoNav({ sports }: { sports?: string[] }) {
  const pathname = usePathname()

  // Esconder graduações só se TODOS os esportes forem boxe
  const allBoxe = !sports || sports.length === 0 || sports.every(s => s === 'boxe')
  const visibleTabs = allBoxe
    ? tabs.filter(t => t.href !== '/aluno/graduacoes')
    : tabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center">
        {visibleTabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            >
              <Icon className={cn('h-5 w-5 transition-colors', active ? 'text-zinc-900' : 'text-zinc-400')} />
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
