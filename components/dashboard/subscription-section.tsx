'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, AlertOctagon, CheckCircle2, ShieldAlert, Clock, Loader2 } from 'lucide-react'

interface SubscriptionSectionProps {
  academy: {
    id: string
    name: string
    plan: string | null
    subscription_status: string | null
    trial_ends_at: string | null
    hasStripeAccount: boolean
  }
}

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter (R$ 79/mês)',
  pro: 'Pro (R$ 175/mês)',
  'multi-unit': 'Multi-unit (R$ 299/mês)',
}

const PLANS_LIST = [
  {
    id: 'price_1TnTDWJbC64QkQGS8OwQNBJM',
    name: 'Starter',
    price: '79',
    period: '/mês',
    description: 'Perfeito para academias em início de jornada.',
    features: [
      'Até 50 alunos ativos',
      'Gestão de treinos e presenças',
      'Histórico básico de faixas',
      'Suporte prioritário por email',
    ],
  },
  {
    id: 'price_1TnTDnJbC64QkQGSlGmIdkcC',
    name: 'Pro',
    price: '175',
    period: '/mês',
    description: 'Ideal para academias em pleno crescimento.',
    features: [
      'Alunos ilimitados',
      'Controle financeiro avançado',
      'Reconhecimento facial com IA',
      'WhatsApp integrado para alertas',
      'Suporte prioritário via WhatsApp',
    ],
    popular: true,
  },
  {
    id: 'price_1TkFfOJFm0PQ5umUgHBYJDvM',
    name: 'Multi-unit',
    price: '299',
    period: '/mês',
    description: 'Para redes de academias e franquias.',
    features: [
      'Múltiplas filiais integradas',
      'Relatórios avançados unificados',
      'Todas as features Pro incluídas',
      'Gerente de contas dedicado',
    ],
  },
]

const PLANS_LIST_VISIBLE = PLANS_LIST.filter(p => p.id !== 'price_1TkFfOJFm0PQ5umUgHBYJDvM')

export function SubscriptionSection({ academy }: SubscriptionSectionProps) {
  const [showPlans, setShowPlans] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenPortal = async () => {
    if (!academy?.hasStripeAccount) {
      setError('Sua conta não possui uma assinatura Stripe ativa.')
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

  const handleSelectPlan = async (priceId: string) => {
    if (!academy?.id) return

    try {
      setPortalLoading(true)
      setError(null)

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          academyId: academy.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao iniciar checkout')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('URL de checkout não retornada')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao processar a assinatura. Tente novamente.'
      setError(errMsg)
      setPortalLoading(false)
    }
  }

  const status = academy?.subscription_status || 'trial'
  const isPastDue = status === 'past_due' || status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired'
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

  if (!academy?.plan) {
    if (!showPlans) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] max-w-xl mx-auto text-center space-y-6 bg-white p-8 border border-gray-200 rounded-2xl shadow-sm my-4">
          <div className="p-4 bg-indigo-50 rounded-full text-indigo-600">
            <CreditCard className="h-10 w-10 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              Ative sua assinatura
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Sua academia ainda não possui um plano ativo. Escolha um plano para começar seu trial de 5 dias gratuitos.
            </p>
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

          <div className="pt-2">
            <Button
              onClick={() => setShowPlans(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 px-10 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20"
            >
              Ver planos disponíveis
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-8 max-w-5xl transition-all duration-500 ease-in-out">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            Ativação de Plano
          </h2>
          <p className="text-sm text-gray-500">
            Sua academia ainda não possui um plano ativo. Escolha uma das opções abaixo para iniciar o trial de 5 dias e ativar o acesso ao dojo.
          </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8 items-stretch mt-8">
          {PLANS_LIST_VISIBLE.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-2xl bg-white border p-8 shadow-xl transition-all duration-300 ${
                plan.popular
                  ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 md:-translate-y-2'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xxs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Mais Popular
                </span>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 mt-2">{plan.description}</p>
                </div>

                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-gray-900">R$ {plan.price}</span>
                  <span className="text-sm font-semibold text-gray-500 ml-1">{plan.period}</span>
                </div>

                <ul className="space-y-3.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={portalLoading}
                  className={`w-full py-5 rounded-xl font-bold transition-all duration-200 ${
                    plan.popular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {portalLoading ? 'Redirecionando...' : 'Iniciar teste gratuito'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl">
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
              disabled={portalLoading || !academy?.hasStripeAccount}
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
