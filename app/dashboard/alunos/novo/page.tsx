'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

interface ViaCepResponse {
  erro?: boolean
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

async function fetchViaCep(cep: string): Promise<ViaCepResponse> {
  const digits = cep.replace(/\D/g, '')
  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  if (!res.ok) throw new Error('Erro na requisição')
  return res.json()
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NovoAlunoPage() {
  const router = useRouter()

  // Campos originais
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [belt, setBelt]             = useState('branca')

  // Novos campos
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [cep, setCep]               = useState('')
  const [logradouro, setLogradouro] = useState('') // preenchido pelo ViaCEP, editável
  const [number, setNumber]         = useState('') // número, preenchido pelo usuário
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity]             = useState('')
  const [state, setState]           = useState('')

  // Estado do CEP
  const [cepLoading, setCepLoading] = useState(false)
  const [cepError, setCepError]     = useState<string | null>(null)

  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // ─── CEP lookup ─────────────────────────────────────────────────────────────

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value)
    setCep(formatted)
    setCError(null)

    const digits = formatted.replace(/\D/g, '')
    if (digits.length < 8) return

    setCepLoading(true)
    try {
      const data = await fetchViaCep(digits)
      if (data.erro) {
        setCepError('CEP não encontrado. Verifique e tente novamente.')
        setLogradouro('')
        setNeighborhood('')
        setCity('')
        setState('')
      } else {
        setLogradouro(data.logradouro ?? '')
        setNeighborhood(data.bairro ?? '')
        setCity(data.localidade ?? '')
        setState(data.uf ?? '')
        setCepError(null)
      }
    } catch {
      setCepError('Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setCepLoading(false)
    }
  }

  // ─── Helper wrapper for lint compliance ───
  const setCError = (val: string | null) => {
    setCepError(val)
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const hasCep = cep.replace(/\D/g, '').length === 8
  const addressFull = logradouro && number
    ? `${logradouro}, ${number}`
    : logradouro || undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasCep && !number) {
      setError('Informe o número do endereço.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/students/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          role: 'aluno',
          belt,
          phone: phone || undefined,
          emergency_phone: emergencyPhone || undefined,
          cep: hasCep ? cep : undefined,
          address: addressFull,
          neighborhood: neighborhood || undefined,
          city: city || undefined,
          state: state || undefined,
        }),
      })

      if (response.status === 409) {
        setError('Este email já está cadastrado.')
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        if (response.status === 403 && data.code === 'PLAN_LIMIT_REACHED') {
          setError(data.error || 'Limite de 50 alunos do plano Starter foi atingido. Faça upgrade para o plano Pro para cadastrar alunos ilimitados.')
          return
        }
        throw new Error(data.error || 'Erro ao cadastrar')
      }

      router.push('/dashboard/alunos?success=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar aluno. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Classe reutilizável para inputs ─────────────────────────────────────────

  const inputClass = "rounded-xl border-gray-200 bg-white py-5 text-gray-900 placeholder-gray-400 focus-visible:ring-indigo-500"
  const labelClass = "text-xs font-semibold text-gray-500"

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/alunos">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cadastrar aluno</h1>
          <p className="text-sm text-gray-400">O aluno receberá a senha de acesso por email automaticamente.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Seção: Dados pessoais ── */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Dados pessoais
            </p>
          </div>

          {/* Nome completo */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className={labelClass}>Nome completo</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Ex: Carlos Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              minLength={2}
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className={labelClass}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="aluno@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className={inputClass}
            />
          </div>


          {/* Telefone + Emergência — grid 2 colunas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className={labelClass}>
                Telefone <span className="font-normal text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyPhone" className={labelClass}>
                Emergência <span className="font-normal text-gray-400">(opcional)</span>
              </Label>
              <Input
                id="emergencyPhone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>
          </div>

          {/* Faixa */}
          <div className="space-y-1.5">
            <Label htmlFor="belt" className={labelClass}>Faixa atual</Label>
            <Select value={belt} onValueChange={(v) => v && setBelt(v)} disabled={loading}>
              <SelectTrigger id="belt" className="rounded-xl border-gray-200 bg-white py-5 text-gray-900">
                <SelectValue placeholder="Selecione a faixa" />
              </SelectTrigger>
              <SelectContent className="border-gray-200 bg-white text-gray-900">
                <SelectItem value="branca">Branca</SelectItem>
                <SelectItem value="azul">Azul</SelectItem>
                <SelectItem value="roxa">Roxa</SelectItem>
                <SelectItem value="marrom">Marrom</SelectItem>
                <SelectItem value="preta">Preta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Seção: Endereço ── */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Endereço <span className="font-normal normal-case tracking-normal text-gray-400">(opcional)</span>
            </p>
          </div>

          {/* CEP */}
          <div className="space-y-1.5">
            <Label htmlFor="cep" className={labelClass}>CEP</Label>
            <div className="relative">
              <Input
                id="cep"
                type="text"
                inputMode="numeric"
                placeholder="00000-000"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                disabled={loading}
                maxLength={9}
                className={`${inputClass} pr-10`}
              />
              {cepLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            {cepError && (
              <p className="text-[11px] text-red-400">{cepError}</p>
            )}
            {!cepError && city && (
              <p className="text-[11px] text-emerald-500">
                ✓ CEP encontrado: {city}/{state}
              </p>
            )}
          </div>

          {/* Logradouro + Número — grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="logradouro" className={labelClass}>Logradouro</Label>
              <Input
                id="logradouro"
                type="text"
                placeholder="Rua, Av., Travessa..."
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="number" className={labelClass}>
                Número{hasCep && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="number"
                type="text"
                placeholder="123"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                disabled={loading}
                required={hasCep}
                className={inputClass}
              />
            </div>
          </div>

          {/* Bairro */}
          <div className="space-y-1.5">
            <Label htmlFor="neighborhood" className={labelClass}>Bairro</Label>
            <Input
              id="neighborhood"
              type="text"
              placeholder="Nome do bairro"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={loading}
              className={inputClass}
            />
          </div>

          {/* Cidade + Estado — grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="city" className={labelClass}>Cidade</Label>
              <Input
                id="city"
                type="text"
                placeholder="São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" className={labelClass}>Estado</Label>
              <Input
                id="state"
                type="text"
                placeholder="SP"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                disabled={loading}
                maxLength={2}
                className={inputClass}
              />
            </div>
          </div>

          {/* Erro geral */}
          {error && (
            <div className="rounded-xl border border-red-800/30 bg-red-950/40 p-3 text-center">
              <p className="text-xs font-medium text-red-400">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/alunos" className="flex-1">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="w-full rounded-xl border-gray-300 py-6 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || !fullName || !email}
              className="flex-1 rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:bg-indigo-500"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar aluno'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
