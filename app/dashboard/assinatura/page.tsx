'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, AlertOctagon } from 'lucide-react'
import { SubscriptionSection } from '@/components/dashboard/subscription-section'

interface AcademyData {
  id: string
  name: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  hasStripeAccount: boolean
}

export default function AssinaturaPage() {
  const [academy, setAcademy] = useState<AcademyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function loadAcademyData() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('Usuário não autenticado')
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('academy_id, role')
          .eq('id', user.id)
          .single()

        if (!profile || profile.role !== 'admin' || !profile.academy_id) {
          setError('Acesso permitido apenas para administradores')
          setLoading(false)
          return
        }

        const { data: academyData, error: academyError } = await supabase
          .from('academies')
          .select('id, name, plan, subscription_status, trial_ends_at, stripe_customer_id')
          .eq('id', profile.academy_id)
          .single()

        if (academyError || !academyData) {
          throw new Error('Erro ao carregar dados da academia')
        }

        setAcademy({
          id: academyData.id,
          name: academyData.name,
          plan: academyData.plan,
          subscription_status: academyData.subscription_status,
          trial_ends_at: academyData.trial_ends_at,
          hasStripeAccount: !!academyData.stripe_customer_id,
        })
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Erro inesperado'
        setError(errMsg)
      } finally {
        setLoading(false)
      }
    }

    loadAcademyData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Assinatura</h1>
        <p className="text-sm text-gray-500">Gerencie o plano e faturamento da sua academia.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 max-w-md">
          <AlertOctagon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Ocorreu um problema</p>
            <p className="text-xs text-red-600/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {academy && <SubscriptionSection academy={academy} />}
    </div>
  )
}
