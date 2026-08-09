'use client'

import React, { useState } from 'react'
import { CheckCircle, Loader2, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function AlteraSenhaPage() {
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew,         setShowNew]         = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [success,         setSuccess]         = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) throw updateError
      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "rounded-xl border-zinc-200 bg-white py-5 text-zinc-900 placeholder-zinc-400 focus-visible:ring-indigo-500 pr-10"
  const labelClass = "text-xs font-semibold text-zinc-500"

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/aluno/perfil"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-indigo-600 transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Perfil
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Alterar senha</h1>
        <p className="text-sm text-zinc-500 mt-1">Escolha uma nova senha de acesso.</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800">Senha alterada com sucesso!</p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="space-y-1.5">
            <Label className={labelClass}>Nova senha</Label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                disabled={loading}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowNew(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Confirmar nova senha</Label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full rounded-2xl bg-indigo-600 py-6 font-semibold text-white hover:bg-indigo-500"
          >
            {loading
              ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Alterando...</span>
              : 'Alterar senha'}
          </Button>

        </form>
      </div>
    </div>
  )
}
