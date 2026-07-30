'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, UserCheck, CalendarDays, ScanLine,
  Award, FileText, BarChart2, Megaphone, Settings, LogOut,
  Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
}

const gestaoItems: NavItem[] = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos',      icon: Users,           label: 'Alunos' },
  { href: '/dashboard/professores', icon: UserCheck,       label: 'Professores' },
  { href: '/dashboard/turmas',      icon: CalendarDays,    label: 'Turmas' },
]

const academiaItems: NavItem[] = [
  { href: '/dashboard/checkins',    icon: ScanLine,  label: 'Check-ins' },
  { href: '/dashboard/graduacoes',  icon: Award,     label: 'Graduações' },
  { href: '/dashboard/contratos',   icon: FileText,  label: 'Contratos' },
  { href: '/dashboard/financeiro',  icon: BarChart2, label: 'Financeiro' },
  { href: '/dashboard/comunicados', icon: Megaphone, label: 'Comunicados' },
]

const contaItems: NavItem[] = [
  { href: '/dashboard/perfil', icon: Settings, label: 'Perfil' },
]

const bottomNavItems: NavItem[] = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/alunos',     icon: Users,           label: 'Alunos' },
  { href: '/dashboard/financeiro', icon: BarChart2,       label: 'Financeiro' },
  { href: '/dashboard/checkins',   icon: ScanLine,        label: 'Check-ins' },
]

const pageTitles: Record<string, string> = {
  '/dashboard/comunicados': 'Comunicados',
  '/dashboard/professores': 'Professores',
  '/dashboard/graduacoes':  'Graduações',
  '/dashboard/financeiro':  'Financeiro',
  '/dashboard/contratos':   'Contratos',
  '/dashboard/checkins':    'Check-ins',
  '/dashboard/alunos':      'Alunos',
  '/dashboard/turmas':      'Turmas',
  '/dashboard/perfil':      'Perfil',
  '/dashboard':             'Painel',
}

function getPageTitle(pathname: string): string {
  for (const [key, title] of Object.entries(pageTitles)) {
    if (key === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(key)) {
      return title
    }
  }
  return 'Painel'
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const pathname = usePathname()
  const isActive = item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm w-full transition-colors duration-100',
        isActive
          ? 'bg-zinc-200 text-zinc-900 font-medium'
          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function NavGroup({
  label,
  items,
  first = false,
  onNavClick,
}: {
  label: string
  items: NavItem[]
  first?: boolean
  onNavClick?: () => void
}) {
  return (
    <div className={first ? '' : 'mt-5'}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 px-2.5 mb-1">
        {label}
      </p>
      <div className="space-y-px">
        {items.map(item => (
          <NavLink key={item.href} item={item} onClick={onNavClick} />
        ))}
      </div>
    </div>
  )
}

function LogoutItem() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm w-full text-red-500 hover:bg-red-50 transition-colors duration-100"
    >
      <LogOut className="h-4 w-4 shrink-0" />
      Sair
    </button>
  )
}

function SidebarContent({ onNavClick, adminName, academyName }: {
  onNavClick?: () => void
  adminName: string
  academyName: string
}) {
  return (
    <>
      {/* Topo */}
      <div className="p-4 border-b border-zinc-100">
        <Logo className="h-7 w-auto" variant="full" />
        <p className="text-xs text-zinc-400 mt-1 truncate">{academyName}</p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <NavGroup label="Gestão" items={gestaoItems} first onNavClick={onNavClick} />
        <NavGroup label="Academia" items={academiaItems} onNavClick={onNavClick} />
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 px-2.5 mb-1">
            Conta
          </p>
          <div className="space-y-px">
            {contaItems.map(item => (
              <NavLink key={item.href} item={item} onClick={onNavClick} />
            ))}
            <LogoutItem />
          </div>
        </div>
      </nav>

      {/* Rodapé com avatar */}
      <div className="p-3 border-t border-zinc-100 mt-auto">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-zinc-700 font-medium truncate flex-1">
            {adminName}
          </span>
        </div>
      </div>
    </>
  )
}

export interface DashboardShellProps {
  children: React.ReactNode
  academyName: string
  adminName: string
}

export function DashboardShell({ children, academyName, adminName }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)

  // Fecha drawer ao navegar
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen bg-zinc-100">

      {/* ── Sidebar Desktop ── */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-zinc-200 h-screen sticky top-0">
        <SidebarContent adminName={adminName} academyName={academyName} />
      </aside>

      {/* ── Área Direita ── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Header Desktop */}
        <header className="hidden lg:flex h-12 items-center px-6 bg-white border-b border-zinc-200 sticky top-0 z-10">
          <h1 className="text-sm font-semibold text-zinc-900">{pageTitle}</h1>
        </header>

        {/* Header Mobile */}
        <header className="lg:hidden fixed top-0 inset-x-0 h-12 bg-white border-b border-zinc-200 flex items-center justify-between px-4 z-30">
          <Logo className="h-7 w-auto" variant="full" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4 text-zinc-500" />
          </button>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 lg:p-0 pt-12 lg:pt-0 pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* ── Bottom Nav Mobile ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-zinc-200 z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center">
          {bottomNavItems.map(item => {
            const isActive = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
              >
                <item.icon className={cn('h-5 w-5 transition-colors', isActive ? 'text-zinc-900' : 'text-zinc-400')} />
                <span className={cn('text-[10px] transition-colors', isActive ? 'text-zinc-900 font-medium' : 'text-zinc-400')}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Botão "Menu" abre drawer */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
            aria-label="Menu"
          >
            <Menu className={cn('h-5 w-5 transition-colors', drawerOpen ? 'text-zinc-900' : 'text-zinc-400')} />
            <span className={cn('text-[10px] transition-colors', drawerOpen ? 'text-zinc-900 font-medium' : 'text-zinc-400')}>
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* ── Drawer Mobile ── */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet */}
          <div className="lg:hidden fixed right-0 top-0 h-full w-72 bg-white border-l border-zinc-200 z-50 flex flex-col">
            {/* Header drawer */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-zinc-100">
              <Logo className="h-7 w-auto" variant="full" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>

            {/* Nav do drawer */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <NavGroup
                label="Gestão"
                items={gestaoItems}
                first
                onNavClick={() => setDrawerOpen(false)}
              />
              <NavGroup
                label="Academia"
                items={academiaItems}
                onNavClick={() => setDrawerOpen(false)}
              />
              <div className="mt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400 px-2.5 mb-1">
                  Conta
                </p>
                <div className="space-y-px">
                  {contaItems.map(item => (
                    <NavLink key={item.href} item={item} onClick={() => setDrawerOpen(false)} />
                  ))}
                  <LogoutItem />
                </div>
              </div>
            </div>

            {/* Rodapé drawer */}
            <div className="p-3 border-t border-zinc-100">
              <div className="flex items-center gap-2.5 px-2 py-1.5">
                <div className="h-7 w-7 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                  {adminName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-zinc-700 font-medium truncate flex-1">
                  {adminName}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
