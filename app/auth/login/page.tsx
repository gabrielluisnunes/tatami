'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) throw authError
    } catch {
      setError('Erro ao iniciar login com Google.')
      setLoading(false)
    }
  }

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
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="rounded-2xl bg-indigo-600/10 p-3 ring-1 ring-indigo-500/20">
            <svg className="h-10 w-10 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-indigo-200 to-white bg-clip-text text-transparent">
            Tatami
          </h1>
          <p className="text-sm text-slate-400">
            Gestão inteligente de academias de artes marciais
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white text-slate-300 py-6 text-sm font-medium transition-all duration-200 rounded-xl"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Entrar com Google</span>
          </Button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase tracking-widest">ou</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

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
