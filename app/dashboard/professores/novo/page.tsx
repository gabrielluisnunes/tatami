'use client'

import { useState } from 'react'
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

export default function NovoProfessorPage() {
  const router = useRouter()

  const [fullName,       setFullName]       = useState('')
  const [email,          setEmail]          = useState('')
  const [belt,           setBelt]           = useState('branca')
  const [phone,          setPhone]          = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/students/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:       fullName,
          email,
          role:            'professor',
          belt,
          phone:           phone           || undefined,
          emergency_phone: emergencyPhone  || undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao cadastrar professor')
      }

      router.push('/dashboard/professores?success=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "rounded-xl border-gray-200 bg-white py-5 text-gray-900 placeholder-gray-400 focus-visible:ring-indigo-500"
  const labelClass = "text-xs font-semibold text-gray-500"

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/professores">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cadastrar professor</h1>
          <p className="text-sm text-gray-400">A senha de acesso será enviada por email.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-2xl backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          <div className="pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
              Dados do professor
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Nome completo</Label>
            <Input
              type="text"
              placeholder="Nome do professor"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              minLength={2}
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className={labelClass}>Email</Label>
            <Input
              type="email"
              placeholder="email@professor.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelClass}>
                Telefone <span className="font-normal text-gray-400">(opcional)</span>
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
                Emergência <span className="font-normal text-gray-400">(opcional)</span>
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
            <Label className={labelClass}>Faixa</Label>
            <Select value={belt} onValueChange={v => v && setBelt(v)} disabled={loading}>
              <SelectTrigger className="rounded-xl border-gray-200 bg-white py-5 text-gray-900">
                <SelectValue />
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

          {error && (
            <div className="rounded-xl border border-red-800/30 bg-red-950/40 p-3 text-center">
              <p className="text-xs font-medium text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Link href="/dashboard/professores" className="flex-1">
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
              className="flex-1 rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
            >
              {loading
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</span>
                : 'Cadastrar professor'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}
