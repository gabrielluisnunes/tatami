'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LogoutButtonProps {
  showText?: boolean
  className?: string
}

export function LogoutButton({ showText = true, className }: LogoutButtonProps) {
  const router = useRouter()
  
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  } 
  
  const defaultClass = showText
    ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
    : "rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className || defaultClass}
    >
      <LogOut className="h-4 w-4 flex-shrink-0" />
      {showText && 'Sair'}
    </button>
  )
}
