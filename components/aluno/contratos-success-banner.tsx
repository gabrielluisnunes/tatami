'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'

export function ContratosSuccessBanner() {
  const searchParams = useSearchParams()
  const signed = searchParams.get('signed')

  if (signed !== '1') return null

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      <div>
        <p className="text-sm font-semibold">Contrato assinado com sucesso!</p>
      </div>
    </div>
  )
}
