'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
          data: { full_name: fullName },
        },
      })

      if (authError) throw authError

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

  const inputClass =
    'w-full border border-zinc-200 rounded-lg px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60'
  const labelClass = 'block text-sm font-medium text-zinc-700 mb-1.5'

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative bg-white rounded-2xl p-8 border border-zinc-200 shadow-xl max-w-sm w-full">
        <div className="flex justify-center mb-6">
          <Logo className="h-10 w-auto" variant="full" />
        </div>

        {emailSent ? (
          <div className="text-center space-y-4">
            <div className="rounded-full bg-indigo-50 border border-indigo-200 p-4 w-16 h-16 flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Verifique seu email</h2>
            <p className="text-sm text-zinc-500">
              Enviamos um link de confirmação para{' '}
              <span className="text-indigo-600 font-medium">{email}</span>.
              Após confirmar, faça login.
            </p>
            <a href="/auth/login" className="block text-sm text-indigo-600 hover:text-indigo-500 font-medium pt-2">
              Ir para o login →
            </a>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-zinc-900 text-center mb-6">
              Criar sua conta
            </h1>

            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-lg py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-60 mb-4"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Cadastrar com Google
            </button>

            <div className="relative flex items-center mb-4">
              <div className="flex-grow border-t border-zinc-200" />
              <span className="mx-4 text-xs text-zinc-400 uppercase tracking-widest">ou</span>
              <div className="flex-grow border-t border-zinc-200" />
            </div>

            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label htmlFor="fullName" className={labelClass}>Nome completo</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>Senha</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={labelClass}>Confirmar senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </form>

            <p className="text-center text-sm text-zinc-500 mt-6">
              Já tem uma conta?{' '}
              <a href="/auth/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Entrar
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
