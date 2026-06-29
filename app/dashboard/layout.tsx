'use client'

import React, { useState } from 'react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { Logo } from '@/components/logo'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Barra Superior para Mobile */}
      <header className="fixed top-0 inset-x-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden shadow-sm">
        <div className="flex items-center gap-2">
          <Logo className="h-10 w-auto" variant="full" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-gray-500 hover:text-gray-900"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </header>

      {/* Backdrop do Menu no Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Menu Lateral) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between border-b border-gray-200 py-5 px-6">
          <Logo className="h-14 w-auto" variant="full" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-900 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Links de Navegação */}
        <SidebarNav />

        {/* Botão de Logout */}
        <div className="border-t border-gray-200 px-3 py-4">
          <LogoutButton />
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 pt-20 md:p-8 md:ml-60 md:pt-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
