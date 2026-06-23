'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, DollarSign, Camera,
  Calendar, Award, GraduationCap, FileText, User,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos',      icon: Users,           label: 'Alunos' },
  { href: '/dashboard/professores', icon: GraduationCap,   label: 'Professores' },
  { href: '/dashboard/financeiro',  icon: DollarSign,      label: 'Financeiro' },
  { href: '/dashboard/checkins',    icon: Camera,          label: 'Check-ins' },
  { href: '/dashboard/turmas',      icon: Calendar,        label: 'Turmas' },
  { href: '/dashboard/graduacoes',  icon: Award,           label: 'Graduações' },
  { href: '/dashboard/contratos',   icon: FileText,        label: 'Contratos' },
  { href: '/dashboard/perfil',      icon: User,            label: 'Perfil' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <item.icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : ''}`} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
