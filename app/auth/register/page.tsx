'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/logo'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleGoogleSignup = async () => {
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
      setError('Erro ao iniciar cadastro com Google.')
      setLoading(false)
    }
  }

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !email || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) {
        throw authError
      }

      if (!data.session) {
        setEmailSent(true)
      } else {
        router.push('/onboarding')
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
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
          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="rounded-full bg-indigo-600/10 p-4 w-16 h-16 flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
                <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">Verifique seu email</h2>
              <p className="text-sm text-slate-400">
                Enviamos um link de confirmação para <span className="text-indigo-400 font-medium">{email}</span>. Após confirmar, faça login.
              </p>
              <a href="/auth/login" className="block text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2">
                Ir para o login →
              </a>
            </div>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:text-white text-slate-300 py-6 text-sm font-medium transition-all duration-200 rounded-xl"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Cadastrar com Google</span>
              </Button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-500 uppercase tracking-widest">ou</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-semibold text-slate-400">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                    className="bg-slate-950/60 border-slate-800/80 text-white placeholder-slate-600 focus-visible:ring-indigo-500 rounded-xl py-5"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-400">Email</Label>
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
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-400">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    className="bg-slate-950/60 border-slate-800/80 text-white placeholder-slate-600 focus-visible:ring-indigo-500 rounded-xl py-5"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-400">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {loading ? 'Cadastrando...' : 'Cadastrar'}
                </Button>

                {error && (
                  <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-center">
                    <p className="text-xs font-medium text-red-400">{error}</p>
                  </div>
                )}
              </form>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Já tem uma conta? </span>
                <a href="/auth/login" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                  Entrar
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
