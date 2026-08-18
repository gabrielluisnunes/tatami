'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  name: string
  email: string
  tempPassword: string
  onContinue: () => void
}

export function EnrollPasswordFallback({ name, email, tempPassword, onContinue }: Props) {
  const [copied, setCopied] = useState(false)

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard indisponível — admin ainda vê a senha na tela
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-zinc-900">Cadastro concluído</h2>
        <p className="mt-2 text-sm text-zinc-600">
          <span className="font-medium text-zinc-900">{name}</span> foi criado, mas o e-mail
          de boas-vindas <span className="font-medium text-amber-700">não foi enviado</span>.
          Anote a senha temporária e repasse manualmente:
        </p>

        <dl className="mt-4 space-y-2 rounded-xl bg-zinc-50 p-4 text-sm">
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd className="font-medium text-zinc-900">{email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Senha temporária</dt>
            <dd className="flex items-center gap-2">
              <code className="font-mono text-base font-bold text-indigo-600">{tempPassword}</code>
              <button
                type="button"
                onClick={copyPassword}
                className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-white hover:text-zinc-900"
                aria-label="Copiar senha"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </dd>
          </div>
        </dl>

        <Button
          type="button"
          onClick={onContinue}
          className="mt-5 w-full rounded-xl bg-indigo-600 py-5 font-semibold text-white hover:bg-indigo-500"
        >
          Entendi, continuar
        </Button>
      </div>
    </div>
  )
}
