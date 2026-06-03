import React from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Tatami Dashboard</h1>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
