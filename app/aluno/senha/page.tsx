'use client'

import React, { useState } from 'react'    
import { CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

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

  const inputClass = "rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500 pr-10"
  const labelClass = "text-xs font-semibold text-zinc-400"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Alterar senha</h1>
        <p className="text-sm text-zinc-500 mt-1">Escolha uma nova senha de acesso.</p>
      </div>

      {success && (                 
        <div className="flex items-center gap-3 rounded-xl border border-emerald-800/30 bg-emerald-950/30 px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-sm text-emerald-300">Senha alterada com sucesso!</p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl">
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showNew
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />}
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showConfirm
                  ? <EyeOff className="h-4 w-4" />
                  : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>                    

          {error && (
            <div className="rounded-xl border border-red-800/30 bg-red-950/40 p-3">
              <p className="text-xs font-medium text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
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
