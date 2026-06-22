'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, AlertOctagon, CheckCircle2, ShieldAlert, Clock, Loader2 } from 'lucide-react'

interface AcademyData {
  id: string
  name: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter (R$ 79/mês)',
  pro: 'Pro (R$ 175/mês)',
  'multi-unit': 'Multi-unit (R$ 299/mês)',
}

export default function AssinaturaPage() {
  const [academy, setAcademy] = useState<AcademyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
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

        setAcademy(academyData)
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Erro inesperado'
        setError(errMsg)
      } finally {
        setLoading(false)
      }
    }

    loadAcademyData()
  }, [])

  const handleOpenPortal = async () => {
    if (!academy?.stripe_customer_id) {
      setError('Sua conta não possui uma assinatura Stripe activa.')
      return
    }

    try {
      setPortalLoading(true)
      setError(null)

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao gerar sessão do portal')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL do portal não retornada')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao redirecionar para o Stripe'
      setError(errMsg)
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  const status = academy?.subscription_status || 'trial'
  const isPastDue = status === 'past_due' || status === 'unpaid'
  const isCanceled = status === 'canceled'
  const isTrial = status === 'trial' || status === 'trialing'
  const isActive = status === 'active'

  const formattedDate = (dateString: string | null) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Gerenciamento de Assinatura
        </h1>
        <p className="text-sm text-gray-500">
          Gerencie o plano, faturamento e acesso da sua academia: {academy?.name}
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
          <AlertOctagon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Ocorreu um problema</p>
            <p className="text-xs text-red-600/90 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Alerta de Inadimplência */}
      {isPastDue && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-4 text-red-800 shadow-sm animate-pulse">
          <ShieldAlert className="h-7 w-7 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-red-950">Acesso Restrito: Pagamento Pendente</h3>
            <p className="text-sm text-red-800/90 leading-relaxed">
              O pagamento da sua última fatura falhou ou está atrasado. Para reativar o acesso total aos recursos do sistema, regularize o faturamento no Stripe o quanto antes.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Cancelamento */}
      {isCanceled && (
        <div className="p-5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-4 text-red-800 shadow-sm">
          <ShieldAlert className="h-7 w-7 shrink-0 text-red-600 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-red-950">Assinatura Cancelada</h3>
            <p className="text-sm text-red-800/90 leading-relaxed">
              Sua assinatura foi cancelada e seu acesso ao painel do dojo está bloqueado. Clique no botão abaixo para reativar seu plano.
            </p>
          </div>
        </div>
      )}

      {/* Alerta de Período de Testes */}
      {isTrial && (
        <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start space-x-4 text-indigo-900 shadow-sm">
          <Clock className="h-7 w-7 shrink-0 text-indigo-600 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-indigo-950">Período de Testes Ativo</h3>
            <p className="text-sm text-indigo-900/90 leading-relaxed">
              Sua academia está usufruindo de 5 dias gratuitos para testar a plataforma. 
              {academy?.trial_ends_at && (
                <span> O período gratuito termina em <strong>{formattedDate(academy.trial_ends_at)}</strong>.</span>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-white border-gray-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Detalhes do Plano
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Informações sobre o plano contratado atualmente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plano</p>
                <p className="text-base font-bold text-gray-900 mt-1">
                  {academy?.plan ? PLAN_NAMES[academy.plan] || academy.plan : 'Nenhum plano ativo'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status da Assinatura</p>
                <div className="mt-1">
                  {isActive && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </span>
                  )}
                  {isTrial && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                      <Clock className="h-3 w-3" /> Testes (Trial)
                    </span>
                  )}
                  {isPastDue && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                      <ShieldAlert className="h-3 w-3 font-bold" /> Pendente
                    </span>
                  )}
                  {isCanceled && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200">
                      <ShieldAlert className="h-3 w-3" /> Cancelado
                    </span>
                  )}
                </div>
              </div>
            </div>

            {academy?.trial_ends_at && isTrial && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fim do Período de Testes</p>
                <p className="text-sm font-medium text-gray-800 mt-1">
                  {formattedDate(academy.trial_ends_at)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-900 to-indigo-950 border-0 shadow-lg text-white flex flex-col justify-between p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Central de Pagamentos</h3>
            <p className="text-xs text-indigo-200/90 leading-relaxed">
              Acesse o painel integrado do Stripe para atualizar seus dados bancários, ver históricos de faturas ou alterar seu plano.
            </p>
          </div>

          <div className="pt-6">
            <Button
              onClick={handleOpenPortal}
              disabled={portalLoading || !academy?.stripe_customer_id}
              className="w-full bg-white hover:bg-zinc-100 text-indigo-900 font-bold py-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-indigo-950/40"
            >
              {portalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-900" />
                  Redirecionando...
                </>
              ) : (
                'Gerenciar Faturamento'
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
