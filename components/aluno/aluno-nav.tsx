'use client'

import Link from 'next/link'        
import { usePathname } from 'next/navigation'
import { Activity, Award, DollarSign, KeyRound, FileText, UserCircle } from 'lucide-react'

const tabs = [
  { href: '/aluno/perfil',      icon: UserCircle,  label: 'Perfil'      },
  { href: '/aluno/frequencia',  icon: Activity,    label: 'Frequência'  },
  { href: '/aluno/graduacoes',  icon: Award,       label: 'Graduações'  },
  { href: '/aluno/financeiro',  icon: DollarSign,  label: 'Financeiro'  },
  { href: '/aluno/contratos',   icon: FileText,    label: 'Contratos'   },
  { href: '/aluno/senha',       icon: KeyRound,    label: 'Senha'       },
]

export function AlunoNav({ sport }: { sport?: string | null }) {
  const pathname = usePathname()

  const visibleTabs = sport === 'boxe'
    ? tabs.filter(t => t.href !== '/aluno/graduacoes')
    : tabs

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg">
        {visibleTabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link                   
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}                   
            >
              <tab.icon className={`h-5 w-5 ${active ? 'text-indigo-400' : ''}`} />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
