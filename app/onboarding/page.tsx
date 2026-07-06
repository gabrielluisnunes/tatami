'use client'

import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Logo } from '@/components/logo'
import { Check } from 'lucide-react'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [createdAcademyId, setCreatedAcademyId] = useState<string | null>(null)
  
  // Step 1 states
  const [fullName, setFullName] = useState('')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmitStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !name || !sport || !monthlyPrice) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          name,
          sport,
          monthly_price: parseFloat(monthlyPrice),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao criar academia')
      }

      const data = await response.json()
      setCreatedAcademyId(data.academy_id)
      setStep(2)
      setLoading(false)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao criar academia. Tente novamente.'
      setError(errMsg)
      setLoading(false)
    }
  }

  const handleSelectPlan = async (priceId: string) => {
    if (!createdAcademyId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          academyId: createdAcademyId,
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
      setLoading(false)
    }
  }



  const plans = [
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

  const plansVisible = plans.filter(p => p.id !== 'price_1TkFfOJFm0PQ5umUgHBYJDvM')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-gray-900 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center mb-6">
          <Logo className="h-14 w-14 text-indigo-600" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-800 to-gray-900 bg-clip-text text-transparent mt-2">
            {step === 1 ? 'Configure sua academia' : 'Escolha seu plano'}
          </h1>
          <p className="text-sm text-gray-500">
            {step === 1 
              ? 'Insira os dados iniciais do seu dojo ou academia' 
              : 'Todos os planos iniciam com 5 dias grátis. Cancele quando quiser.'}
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center max-w-md mx-auto">
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        {step === 1 ? (
          <div className="max-w-lg mx-auto bg-white border border-gray-200 rounded-2xl p-8 shadow-xl space-y-6">
            <form onSubmit={handleSubmitStep1} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs font-semibold text-gray-500">
                  Seu nome completo
                </Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Ex: Gabriel Nunes"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus-visible:ring-indigo-500 rounded-xl py-5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-500">
                  Nome da academia
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: CT Tatami"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus-visible:ring-indigo-500 rounded-xl py-5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sport" className="text-xs font-semibold text-gray-500">
                  Modalidade principal
                </Label>
                <Select value={sport} onValueChange={(v) => v && setSport(v)} disabled={loading} required>
                  <SelectTrigger id="sport" className="bg-white border-gray-200 text-gray-900 rounded-xl py-5">
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900">
                    <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
                    <SelectItem value="muay thai">Muay Thai</SelectItem>
                    <SelectItem value="boxe">Boxe</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>



              <div className="space-y-2">
                <Label htmlFor="monthly_price" className="text-xs font-semibold text-gray-500">
                  Valor padrão da mensalidade (R$)
                </Label>
                <Input
                  id="monthly_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="150.00"
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus-visible:ring-indigo-500 rounded-xl py-5"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !fullName || !name || !sport || !monthlyPrice}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20"
              >
                {loading ? 'Processando...' : 'Continuar para planos →'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8 items-stretch">
            {plansVisible.map((plan) => (
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
                    <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                    <p className="text-xs text-gray-500 mt-2">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold tracking-tight text-gray-900">R$ {plan.price}</span>
                    <span className="text-sm font-semibold text-gray-500 ml-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-3.5">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <Check className="h-5 w-5 text-indigo-500 shrink-0 mr-2" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading}
                    className={`w-full py-5 rounded-xl font-bold transition-all duration-200 ${
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {loading ? 'Redirecionando...' : 'Iniciar teste gratuito'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
