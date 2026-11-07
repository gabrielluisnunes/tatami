'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { PasswordInput } from '@/components/auth/password-input'
import { AuthShell, authButtonClass, authInputClass, authLabelClass } from '@/components/auth/auth-shell'

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
    <AuthShell mode="login">
      <h1 className="auth-title">Seu treino continua aqui.</h1>
      <p className="auth-description">Entre na sua conta para continuar sua jornada.</p>

      <form aria-busy={loading} onSubmit={handleEmailLogin} className="mt-8 space-y-5">
        <label className={authLabelClass} htmlFor="email">
          E-mail
          <input id="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required className={authInputClass} />
        </label>
        <div>
          <label className={authLabelClass} htmlFor="password">Senha</label>
          <PasswordInput id="password" autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} required />
        </div>
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? <><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Entrando...</> : <>Entrar na minha conta <ArrowRight size={17} aria-hidden="true" /></>}
        </button>
      </form>
      <p className="auth-switch">Sua academia ainda não está no Tatami?{' '}
        <Link href="/auth/register">Criar conta</Link>
      </p>
    </AuthShell>
  )
}
