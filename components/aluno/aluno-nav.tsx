'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Award, DollarSign, FileText, UserCircle } from 'lucide-react'

const tabs = [
  { href: '/aluno/frequencia', icon: Home,        label: 'Início'     },
  { href: '/aluno/graduacoes', icon: Award,       label: 'Graduações' },
  { href: '/aluno/financeiro', icon: DollarSign,  label: 'Financeiro' },
  { href: '/aluno/contratos',  icon: FileText,    label: 'Contratos'  },
  { href: '/aluno/perfil',     icon: UserCircle,  label: 'Perfil'     },
]

export function AlunoNav({ sport }: { sport?: string | null }) {
  const pathname = usePathname()

  const visibleTabs = sport === 'boxe'
    ? tabs.filter(t => t.href !== '/aluno/graduacoes')
    : tabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleTabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Icon className={`h-5 w-5 ${active ? 'text-indigo-400' : 'text-zinc-500'}`} />
              <span className={`text-[10px] font-medium ${active ? 'text-indigo-400' : 'text-zinc-500'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
