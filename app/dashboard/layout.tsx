import React from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Camera,
  Calendar,
  Award,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos', icon: Users, label: 'Alunos' },
  { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/checkins', icon: Camera, label: 'Check-ins' },
  { href: '/dashboard/turmas', icon: Calendar, label: 'Turmas' },
  { href: '/dashboard/graduacoes', icon: Award, label: 'Graduações' },
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
        <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
          <div className="rounded-lg bg-indigo-600/10 p-1.5 ring-1 ring-indigo-500/20">
            <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-white bg-clip-text text-transparent">
            Tatami
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t border-zinc-800 px-3 py-4">
          <Link
            href="/auth/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-8">
        {children}
      </main>
    </div>
  )
}
