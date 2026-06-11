import React from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Camera,
  Calendar,
  Award,
  GraduationCap,
} from 'lucide-react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { Logo } from '@/components/logo'

const navItems = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos',      icon: Users,           label: 'Alunos' },
  { href: '/dashboard/professores', icon: GraduationCap,   label: 'Professores' },
  { href: '/dashboard/financeiro',  icon: DollarSign,      label: 'Financeiro' },
  { href: '/dashboard/checkins',    icon: Camera,          label: 'Check-ins' },
  { href: '/dashboard/turmas',      icon: Calendar,        label: 'Turmas' },
  { href: '/dashboard/graduacoes',  icon: Award,           label: 'Graduações' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-zinc-800 bg-zinc-900">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center border-b border-zinc-800 py-5 px-6">
          <Logo className="h-14 w-auto" variant="full" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-800 px-3 py-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
