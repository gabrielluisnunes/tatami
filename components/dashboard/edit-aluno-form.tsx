'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface SportEntry {
  sport: string
  belt: string
  degree: number
}

interface InitialData {
  id: string
  full_name: string
  birth_date?: string | null
  phone: string | null
  emergency_phone: string | null
  belt: string
  degree: number
  sport?: string | null
  sports?: SportEntry[]
  cep: string | null
  address: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
}

interface EditAlunoFormProps {
  studentId: string
  initialData: InitialData
  successRedirect?: string
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function resolveInitialSports(data: InitialData): SportEntry[] {
  if (data.sports && data.sports.length > 0) {
    return data.sports.map((s) => ({
      sport: s.sport,
      belt: s.belt ?? '',
      degree: s.degree ?? 0,
    }))
  }
  return [{
    sport: data.sport ?? 'jiu-jitsu',
    belt: data.belt ?? 'branca',
    degree: data.degree ?? 0,
  }]
}

export function EditAlunoForm({ studentId, initialData, successRedirect = '/dashboard/alunos' }: EditAlunoFormProps) {
  const router = useRouter()

  const [fullName,       setFullName]       = useState(initialData.full_name)
  const [birthDate,      setBirthDate]      = useState(initialData.birth_date ?? '')
  const [phone,          setPhone]          = useState(initialData.phone ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_phone ?? '')
  const [sports,         setSports]         = useState<SportEntry[]>(() => resolveInitialSports(initialData))
  const [cep,            setCep]            = useState(initialData.cep ?? '')
  const [address,        setAddress]        = useState(initialData.address ?? '')
  const [neighborhood,   setNeighborhood]   = useState(initialData.neighborhood ?? '')
  const [city,           setCity]           = useState(initialData.city ?? '')
  const [state,          setState]          = useState(initialData.state ?? '')

  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function addSport() {
    setSports((prev) => [...prev, { sport: '', belt: '', degree: 0 }])
  }
  function removeSport(index: number) {
    setSports((prev) => prev.filter((_, i) => i !== index))
  }
  function updateSport(index: number, field: keyof SportEntry, value: string | number) {
    setSports((prev) => prev.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    ))
  }

  const handleCepChange = async (value: string) => {
    const formatted = formatCep(value)
    setCep(formatted)
    setCepError(null)
    const digits = formatted.replace(/\D/g, '')
    if (digits.length < 8) return
    setCepLoading(true)
    try {
      const res  = await fetch(`/api/viacep?cep=${digits}`)
      const data = await res.json()
      if (data.erro) {
        setCepError('CEP não encontrado.')
      } else {
        setAddress(data.logradouro ?? '')
        setNeighborhood(data.bairro ?? '')
        setCity(data.localidade ?? '')
        setState(data.uf ?? '')
      }
    } catch {
      setCepError('Erro ao buscar CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sports.length === 0 || sports.some((s) => !s.sport)) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:       fullName,
          ...(birthDate ? { birth_date: birthDate } : {}),
          phone:           phone || null,
          emergency_phone: emergencyPhone || null,
          sports: sports.filter(s => s.sport !== ''),
          cep:             cep || null,
          address:         address || null,
          neighborhood:    neighborhood || null,
          city:            city || null,
          state:           state || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao salvar')
      }
      router.push(`${successRedirect}?updated=true`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar alterações.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "rounded-lg border-zinc-200 bg-white py-2.5 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
  const labelClass = "text-xs font-semibold text-zinc-700"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Dados pessoais
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Nome completo</Label>
        <Input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          minLength={2}
          disabled={loading}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={labelClass}>
            Telefone <span className="font-normal text-zinc-400">(opcional)</span>
          </Label>
          <Input
            type="tel"
            placeholder="(11) 99999-9999"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={loading}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>
            Emergência <span className="font-normal text-zinc-400">(opcional)</span>
          </Label>
          <Input
            type="tel"
            placeholder="(11) 99999-9999"
            value={emergencyPhone}
            onChange={e => setEmergencyPhone(e.target.value)}
            disabled={loading}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="editBirthDate" className={labelClass}>
          Data de nascimento <span className="font-normal text-zinc-400">(opcional)</span>
        </Label>
        <Input
          id="editBirthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          disabled={loading}
          className={inputClass}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Esportes e Graduações */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className={labelClass}>Esportes e Graduações</Label>
          <button
            type="button"
            onClick={addSport}
            disabled={loading}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
          >
            + Adicionar esporte
          </button>
        </div>

        {sports.map((s, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2"
          >
            <Select
              value={s.sport || undefined}
              onValueChange={(v) => {
                if (!v) return
                updateSport(index, 'sport', v)
                updateSport(
                  index,
                  'belt',
                  v === 'jiu-jitsu' ? 'branca' : v === 'muay-thai' ? 'branco' : ''
                )
                updateSport(index, 'degree', 0)
              }}
              disabled={loading}
            >
              <SelectTrigger className="min-w-[8.5rem] flex-1 h-9 rounded-lg border-zinc-200 bg-white text-sm text-zinc-900">
                <SelectValue placeholder="Esporte" />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
                <SelectItem value="muay-thai">Muay Thai</SelectItem>
                <SelectItem value="boxe">Boxe</SelectItem>
              </SelectContent>
            </Select>

            {s.sport && s.sport !== 'boxe' && (
              <Select
                value={s.belt || undefined}
                onValueChange={(v) => v && updateSport(index, 'belt', v)}
                disabled={loading}
              >
                <SelectTrigger className="min-w-[7.5rem] flex-1 h-9 rounded-lg border-zinc-200 bg-white text-sm text-zinc-900">
                  <SelectValue placeholder={s.sport === 'muay-thai' ? 'Prajied' : 'Faixa'} />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                  {s.sport === 'jiu-jitsu' && (
                    <>
                      <SelectItem value="branca">Branca</SelectItem>
                      <SelectItem value="azul">Azul</SelectItem>
                      <SelectItem value="roxa">Roxa</SelectItem>
                      <SelectItem value="marrom">Marrom</SelectItem>
                      <SelectItem value="preta">Preta</SelectItem>
                    </>
                  )}
                  {s.sport === 'muay-thai' && (
                    <>
                      <SelectItem value="branco">Branco</SelectItem>
                      <SelectItem value="laranja">Laranja</SelectItem>
                      <SelectItem value="azul-mt">Azul</SelectItem>
                      <SelectItem value="vermelho">Vermelho</SelectItem>
                      <SelectItem value="amarelo">Amarelo</SelectItem>
                      <SelectItem value="verde">Verde</SelectItem>
                      <SelectItem value="marrom-mt">Marrom</SelectItem>
                      <SelectItem value="preto-mt">Preto</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            )}

            {s.sport === 'jiu-jitsu' && (
              <Select
                value={String(s.degree)}
                onValueChange={(v) => v && updateSport(index, 'degree', Number(v))}
                disabled={loading}
              >
                <SelectTrigger className="min-w-[6.5rem] h-9 rounded-lg border-zinc-200 bg-white text-sm text-zinc-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                  <SelectItem value="0">Sem grau</SelectItem>
                  <SelectItem value="1">1º grau</SelectItem>
                  <SelectItem value="2">2º grau</SelectItem>
                  <SelectItem value="3">3º grau</SelectItem>
                  <SelectItem value="4">4º grau</SelectItem>
                </SelectContent>
              </Select>
            )}

            {sports.length > 1 && (
              <button
                type="button"
                onClick={() => removeSport(index)}
                disabled={loading}
                className="ml-auto shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Remover esporte"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Endereço <span className="font-normal normal-case tracking-normal text-zinc-400">(opcional)</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>CEP</Label>
        <div className="relative">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="00000-000"
            value={cep}
            onChange={e => handleCepChange(e.target.value)}
            maxLength={9}
            disabled={loading}
            className={`${inputClass} pr-10`}
          />
          {cepLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
            </div>
          )}
        </div>
        {cepError && <p className="text-[11px] text-red-500">{cepError}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Endereço</Label>
        <Input
          type="text"
          placeholder="Rua, Av. e número"
          value={address}
          onChange={e => setAddress(e.target.value)}
          disabled={loading}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label className={labelClass}>Bairro</Label>
        <Input
          type="text"
          placeholder="Nome do bairro"
          value={neighborhood}
          onChange={e => setNeighborhood(e.target.value)}
          disabled={loading}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className={labelClass}>Cidade</Label>
          <Input
            type="text"
            placeholder="São Paulo"
            value={city}
            onChange={e => setCity(e.target.value)}
            disabled={loading}
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label className={labelClass}>Estado</Label>
          <Input
            type="text"
            placeholder="SP"
            value={state}
            onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            disabled={loading}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-xs font-medium text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link href={successRedirect} className="flex-1">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            className="w-full rounded-lg border-zinc-200 py-2.5 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
          >
            Cancelar
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={loading || !fullName || sports.length === 0 || sports.some((s) => !s.sport)}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-500"
        >
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>

    </form>
  )
}
