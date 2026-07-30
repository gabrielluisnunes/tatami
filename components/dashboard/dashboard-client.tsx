'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { LogoutButton } from '@/components/dashboard/logout-button'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  DollarSign,
  Calendar,
  Dumbbell,
  UserCheck,
  FileText,
  Megaphone,
  Settings,
  Menu,
  X,
  Camera,
  LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

const desktopNavItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos', icon: Users, label: 'Alunos' },
  { href: '/dashboard/graduacoes', icon: GraduationCap, label: 'Graduações' },
  { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/checkins', icon: Calendar, label: 'Check-ins' },
  { href: '/dashboard/turmas', icon: Dumbbell, label: 'Turmas' },
  { href: '/dashboard/professores', icon: UserCheck, label: 'Professores' },
  { href: '/dashboard/contratos', icon: FileText, label: 'Contratos' },
  { href: '/dashboard/comunicados', icon: Megaphone, label: 'Comunicados' },
]

const bottomNavItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos', icon: Users, label: 'Alunos' },
  { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
  { href: '/dashboard/checkins', icon: Camera, label: 'Check-ins' },
]

const drawerNavItems: NavItem[] = [
  { href: '/dashboard/graduacoes', icon: GraduationCap, label: 'Graduações' },
  { href: '/dashboard/turmas', icon: Dumbbell, label: 'Turmas' },
  { href: '/dashboard/professores', icon: UserCheck, label: 'Professores' },
  { href: '/dashboard/contratos', icon: FileText, label: 'Contratos' },
  { href: '/dashboard/comunicados', icon: Megaphone, label: 'Comunicados' },
  { href: '/dashboard/perfil', icon: Settings, label: 'Perfil' },
]

interface DashboardClientProps {
  children: React.ReactNode
  academyName: string
  adminName: string
}

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard' || pathname === '/dashboard/') return 'Painel'
  if (pathname.startsWith('/dashboard/alunos')) return 'Alunos'
  if (pathname.startsWith('/dashboard/graduacoes')) return 'Graduações'
  if (pathname.startsWith('/dashboard/financeiro')) return 'Financeiro'
  if (pathname.startsWith('/dashboard/checkins')) return 'Check-ins'
  if (pathname.startsWith('/dashboard/turmas')) return 'Turmas'
  if (pathname.startsWith('/dashboard/professores')) return 'Professores'
  if (pathname.startsWith('/dashboard/contratos')) return 'Contratos'
  if (pathname.startsWith('/dashboard/comunicados')) return 'Comunicados'
  if (pathname.startsWith('/dashboard/perfil')) return 'Perfil'
  return 'Painel'
}

function isItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname === '/dashboard/'
  }
  return pathname.startsWith(href)
}

export function DashboardClient({
  children,
  academyName,
  adminName,
}: DashboardClientProps) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  const userInitial = adminName ? adminName.charAt(0).toUpperCase() : 'A'

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 antialiased font-sans">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          DESKTOP (lg+): Sidebar fixa à esquerda
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200/80 h-screen sticky top-0 flex-col shrink-0 z-30 shadow-xs">
        {/* TOPO: Logo Tatami + nome da academia */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
          <Logo variant="icon" className="h-9 w-9 shrink-0 rounded-xl shadow-xs" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Tatami
            </span>
            <span
              className="text-sm font-bold text-slate-900 truncate"
              title={academyName || 'Academia'}
            >
              {academyName || 'Minha Academia'}
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO */}
        <nav className="flex-1 flex flex-col gap-1.5 p-3 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const active = isItemActive(item.href, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* RODAPÉ */}
        <div className="mt-auto p-3 border-t border-slate-100 flex flex-col gap-1 bg-slate-50/50">
          {(() => {
            const active = isItemActive('/dashboard/perfil', pathname)
            return (
              <Link
                href="/dashboard/perfil"
                className={`rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Settings
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>Perfil</span>
              </Link>
            )
          })()}

          <div className="border-t border-slate-200/60 my-1" />

          <LogoutButton className="rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full" />
        </div>
      </aside>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          ÁREA PRINCIPAL (Header + Conteúdo)
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header Desktop (lg+) */}
        <header className="hidden lg:flex h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 items-center justify-between sticky top-0 z-20 shadow-2xs">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {getPageTitle(pathname)}
          </h2>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center text-xs shadow-sm shadow-indigo-200 ring-2 ring-indigo-100 shrink-0">
              {userInitial}
            </div>
            <span className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
              {adminName}
            </span>
          </div>
        </header>

        {/* Header Mobile (< lg) */}
        <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Logo variant="icon" className="h-7 w-7 rounded-lg shadow-xs" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Tatami
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 overflow-auto bg-slate-50 p-4 pt-18 pb-24 lg:p-8 lg:pt-8 lg:pb-8">
          {children}
        </main>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MOBILE (< lg): Bottom Navigation & Drawer
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 z-40 px-2 py-1.5 flex items-center justify-around pb-safe shadow-lg">
          {bottomNavItems.map((item) => {
            const active = isItemActive(item.href, pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all flex-1 ${
                  active
                    ? 'text-indigo-600 font-semibold'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={`text-[10px] ${
                    active ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Item 5: Menu -> abre drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all flex-1 text-slate-400 hover:text-slate-600"
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="text-[10px] font-normal">Menu</span>
          </button>
        </nav>

        {/* Drawer Lateral */}
        {drawerOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-72 bg-white z-50 shadow-2xl p-6 flex flex-col lg:hidden border-l border-slate-200">
              {/* Header do Drawer */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Logo variant="icon" className="h-7 w-7 rounded-lg shadow-xs" />
                  <span className="text-sm font-bold text-slate-900 truncate max-w-[160px]">
                    {academyName || 'Tatami'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Lista com todos os itens restantes */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto">
                {drawerNavItems.map((item) => {
                  const active = isItemActive(item.href, pathname)
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          active ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>

              {/* Rodapé do Drawer */}
              <div className="mt-auto pt-4 border-t border-slate-100">
                <LogoutButton className="rounded-xl px-3.5 py-2.5 flex items-center gap-3 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors w-full" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
