'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    try {
      setLoading(true)
      setError(null)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError || !authData.user) {
        throw new Error('Email ou senha incorretos')
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        await supabase.auth.signOut()
        throw new Error('Perfil ou cargo não encontrado')
      }

      const role = profile.role

      if (role === 'admin') {
        router.push('/dashboard')
      } else if (role === 'professor') {
        router.push('/professor/checkin')
      } else if (role === 'aluno') {
        router.push('/aluno/frequencia')
      } else {
        await supabase.auth.signOut()
        throw new Error('Permissão não reconhecida')
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      if (errorMessage === 'Perfil ou cargo não encontrado' || errorMessage === 'Permissão não reconhecida') {
        setError(errorMessage)
      } else {
        setError('Email ou senha incorretos')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 px-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center mb-6">
          <Logo className="h-28 w-auto" variant="full" />
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="text-xs font-semibold text-slate-400">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="bg-slate-950/60 border-slate-800/80 text-white placeholder-slate-600 focus-visible:ring-indigo-500 rounded-xl py-5"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="text-xs font-semibold text-slate-400">Senha</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="bg-slate-950/60 border-slate-800/80 text-white placeholder-slate-600 focus-visible:ring-indigo-500 rounded-xl py-5"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-center">
                <p className="text-xs font-medium text-red-400">{error}</p>
              </div>
            )}

            <div className="text-center pt-2">
              <span className="text-xs text-slate-500">Não tem uma conta? </span>
              <a href="/auth/register" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Criar conta
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
