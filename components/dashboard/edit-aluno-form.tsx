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

interface InitialData {
  id: string
  full_name: string
  birth_date?: string | null
  phone: string | null
  emergency_phone: string | null
  belt: string
  degree: number
  sport?: string | null
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

export function EditAlunoForm({ studentId, initialData, successRedirect = '/dashboard/alunos' }: EditAlunoFormProps) {
  const router = useRouter()

  const [fullName,       setFullName]       = useState(initialData.full_name)
  const [birthDate,      setBirthDate]      = useState(initialData.birth_date ?? '')
  const [phone,          setPhone]          = useState(initialData.phone ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_phone ?? '')
  const [belt,           setBelt]           = useState(initialData.belt ?? 'branca')
  const [degree,         setDegree]         = useState<number>(initialData.degree ?? 0)
  const [sport,          setSport]          = useState<string>(initialData.sport ?? 'jiu-jitsu')
  const [cep,            setCep]            = useState(initialData.cep ?? '')
  const [address,        setAddress]        = useState(initialData.address ?? '')
  const [neighborhood,   setNeighborhood]   = useState(initialData.neighborhood ?? '')
  const [city,           setCity]           = useState(initialData.city ?? '')
  const [state,          setState]          = useState(initialData.state ?? '')

  const [cepLoading, setCepLoading] = useState(false)
  const [cepError,   setCepError]   = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

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
          sport,
          ...(sport === 'boxe' ? { belt: null, degree: 0 } : { belt, degree }),
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

      {/* Esporte */}
      <div className="space-y-1.5">
        <Label className={labelClass}>Esporte</Label>
        <Select value={sport} onValueChange={(v) => { if (v) { setSport(v); setBelt(''); setDegree(0) } }} disabled={loading}>
          <SelectTrigger className="rounded-lg border-zinc-200 bg-white py-2.5 text-zinc-900">
            <SelectValue placeholder="Selecione o esporte" />
          </SelectTrigger>
          <SelectContent className="border-zinc-200 bg-white text-zinc-900">
            <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
            <SelectItem value="muay-thai">Muay Thai</SelectItem>
            <SelectItem value="boxe">Boxe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Faixa + Grau — condicional por esporte */}
      {sport !== 'boxe' && (
        <div className={`grid ${sport === 'jiu-jitsu' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
          <div className="space-y-1.5">
            <Label className={labelClass}>
              {sport === 'muay-thai' ? 'Prajied (graduação)' : 'Faixa atual'}
            </Label>
            <Select value={belt} onValueChange={v => v && setBelt(v)} disabled={loading}>
              <SelectTrigger className="rounded-lg border-zinc-200 bg-white py-2.5 text-zinc-900">
                <SelectValue placeholder={sport === 'muay-thai' ? 'Selecione o prajied' : 'Selecione a faixa'} />
              </SelectTrigger>
              <SelectContent className="border-zinc-200 bg-white text-zinc-900">
                {sport === 'jiu-jitsu' && (
                  <>
                    <SelectItem value="branca">Branca</SelectItem>
                    <SelectItem value="azul">Azul</SelectItem>
                    <SelectItem value="roxa">Roxa</SelectItem>
                    <SelectItem value="marrom">Marrom</SelectItem>
                    <SelectItem value="preta">Preta</SelectItem>
                  </>
                )}
                {sport === 'muay-thai' && (
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
          </div>
          {sport === 'jiu-jitsu' && (
            <div className="space-y-1.5">
              <Label className={labelClass}>Grau</Label>
              <Select value={String(degree)} onValueChange={v => v && setDegree(Number(v))} disabled={loading}>
                <SelectTrigger className="rounded-lg border-zinc-200 bg-white py-2.5 text-zinc-900">
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
            </div>
          )}
        </div>
      )}

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
          disabled={loading || !fullName}
          className="flex-1 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-500"
        >
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>

    </form>
  )
}
