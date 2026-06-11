'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [dueDay, setDueDay] = useState('10')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName || !name || !sport || !dueDay || !monthlyPrice) return

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
          due_day: parseInt(dueDay, 10),
          monthly_price: parseFloat(monthlyPrice),
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar academia')
      }

      router.push('/dashboard')
    } catch {
      setError('Erro ao criar academia. Tente novamente.')
      setLoading(false)
    }
  }

  const dueDays = Array.from({ length: 28 }, (_, i) => String(i + 1))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex flex-col items-center space-y-2 text-center mb-6">
          <Logo className="h-14 w-14 text-indigo-600" />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-800 to-zinc-50 bg-clip-text text-transparent mt-2">
            Configure sua academia
          </h1>
          <p className="text-sm text-zinc-400">
            Essas informações podem ser alteradas depois
          </p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-xs font-semibold text-zinc-400">
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
                className="bg-zinc-950/60 border-zinc-800/80 text-white placeholder-zinc-600 focus-visible:ring-indigo-500 rounded-xl py-5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-zinc-400">
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
                className="bg-zinc-950/60 border-zinc-800/80 text-white placeholder-zinc-600 focus-visible:ring-indigo-500 rounded-xl py-5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sport" className="text-xs font-semibold text-zinc-400">
                Modalidade principal
              </Label>
              <Select value={sport} onValueChange={(v) => v && setSport(v)} disabled={loading} required>
                <SelectTrigger id="sport" className="bg-zinc-950/60 border-zinc-800/80 text-white rounded-xl py-5">
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
                  <SelectItem value="muay thai">Muay Thai</SelectItem>
                  <SelectItem value="boxe">Boxe</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day" className="text-xs font-semibold text-zinc-400">
                Dia de vencimento da mensalidade
              </Label>
              <Select value={dueDay} onValueChange={(v) => v && setDueDay(v)} disabled={loading} required>
                <SelectTrigger id="due_day" className="bg-zinc-950/60 border-zinc-800/80 text-white rounded-xl py-5">
                  <SelectValue placeholder="Dia do vencimento" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-h-52">
                  {dueDays.map((day) => (
                    <SelectItem key={day} value={day}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_price" className="text-xs font-semibold text-zinc-400">
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
                className="bg-zinc-950/60 border-zinc-800/80 text-white placeholder-zinc-600 focus-visible:ring-indigo-500 rounded-xl py-5"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !fullName || !name || !sport || !monthlyPrice}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20"
            >
              {loading ? 'Criando...' : 'Criar academia'}
            </Button>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/30 rounded-xl text-center">
                <p className="text-xs font-medium text-red-400">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
