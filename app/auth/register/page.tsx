'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { PasswordInput } from '@/components/auth/password-input'
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from '@/components/auth/auth-shell'

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

  return (
    <AuthShell mode="register">
      {emailSent ? (
        <div role="status">
          <div aria-hidden="true" className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#f4e1dc] text-xl text-[#b42421]"><Check aria-hidden="true" /></div>
          <h1 className="auth-title">Confira seu e-mail.</h1>
          <p className="mt-4 text-sm leading-6 text-[#70706b]">Enviamos um link de confirmação para <strong className="break-all text-[#202020]">{email}</strong>. Confirme seu endereço para entrar.</p>
          <Link href="/auth/login" className="mt-7 inline-flex min-h-12 items-center font-semibold text-[#b42421] hover:underline">Voltar para o login →</Link>
        </div>
      ) : (
        <>
          <h1 className="auth-title">Grandes jornadas começam aqui.</h1>
          <p className="auth-description">Crie sua conta e leve sua academia para o próximo nível.</p>
          <button type="button" onClick={handleGoogleSignup} disabled={loading} className="auth-google">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.6 24.5c0-1.5-.1-2.9-.4-4.4H24v8.3h11a9.4 9.4 0 0 1-4.1 6.2v5.2h6.7c3.9-3.6 6-8.9 6-15.3Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.2A12.2 12.2 0 0 1 12.7 28H5.8v5.4A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.7 28a12 12 0 0 1 0-8V14.6H5.8a20 20 0 0 0 0 18.8Z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3l5.9-5.9A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.8 14.6l6.9 5.4A12 12 0 0 1 24 12Z"/></svg> Continuar com Google
          </button>
          <div className="auth-divider">ou cadastre-se com e-mail</div>
          <form aria-busy={loading} onSubmit={handleEmailSignup} className="space-y-4">
            <label htmlFor="fullName" className={authLabelClass}>Nome completo
              <input id="fullName" autoComplete="name" placeholder="Seu nome completo" value={fullName} onChange={e => setFullName(e.target.value)} disabled={loading} required className={authInputClass} />
            </label>
            <label htmlFor="email" className={authLabelClass}>E-mail
              <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required className={authInputClass} />
            </label>
            <div className="auth-password-fields">
              <div>
                <label htmlFor="password" className={authLabelClass}>Senha</label>
                <PasswordInput id="password" autoComplete="new-password" minLength={6} aria-describedby="password-hint" placeholder="Crie uma senha" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
              </div>
              <div>
                <label htmlFor="confirmPassword" className={authLabelClass}>Confirmar senha</label>
                <PasswordInput id="confirmPassword" autoComplete="new-password" minLength={6} placeholder="Repita sua senha" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} required />
              </div>
            </div>
            <p id="password-hint" className="auth-password-hint">Use pelo menos 6 caracteres na sua senha.</p>
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className={authButtonClass}>{loading ? <><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Criando conta...</> : <>Criar minha conta <ArrowRight size={17} aria-hidden="true" /></>}</button>
          </form>
          <p className="auth-switch">Já tem uma conta?{' '}
            <Link href="/auth/login">Entrar</Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
