import React from 'react'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { Logo } from '@/components/logo'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center border-b border-gray-200 py-5 px-6">
          <Logo className="h-14 w-auto" variant="full" />
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* Logout */}
        <div className="border-t border-gray-200 px-3 py-4">
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
