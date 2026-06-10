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
  phone: string | null
  emergency_phone: string | null
  belt: string
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
  const [phone,          setPhone]          = useState(initialData.phone ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(initialData.emergency_phone ?? '')
  const [belt,           setBelt]           = useState(initialData.belt ?? 'branca')
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
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
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
          phone:           phone || null,
          emergency_phone: emergencyPhone || null,
          belt,
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

  const inputClass = "rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
  const labelClass = "text-xs font-semibold text-zinc-400"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
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
            Telefone <span className="font-normal text-zinc-600">(opcional)</span>
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
            Emergência <span className="font-normal text-zinc-600">(opcional)</span>
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
        <Label className={labelClass}>Faixa atual</Label>
        <Select value={belt} onValueChange={v => v && setBelt(v)} disabled={loading}>
          <SelectTrigger className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
            <SelectItem value="branca">Branca</SelectItem>
            <SelectItem value="azul">Azul</SelectItem>
            <SelectItem value="roxa">Roxa</SelectItem>
            <SelectItem value="marrom">Marrom</SelectItem>
            <SelectItem value="preta">Preta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
          Endereço <span className="font-normal normal-case tracking-normal text-zinc-700">(opcional)</span>
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
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          )}
        </div>
        {cepError && <p className="text-[11px] text-red-400">{cepError}</p>}
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
        <div className="rounded-xl border border-red-800/30 bg-red-950/40 p-3 text-center">
          <p className="text-xs font-medium text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Link href={successRedirect} className="flex-1">
          <Button
            type="button"
            variant="outline"
            disabled={loading}      
            className="w-full rounded-xl border-zinc-700 py-6 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Cancelar
          </Button>                 
        </Link>
        <Button
          type="submit"
          disabled={loading || !fullName}
          className="flex-1 rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
        >
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>

    </form>
  )
}
