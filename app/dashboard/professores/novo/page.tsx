'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { EnrollPasswordFallback } from '@/components/dashboard/enroll-password-fallback'

type Sport = 'jiu-jitsu' | 'muay-thai' | 'boxe'

const SPORT_OPTIONS: { id: Sport; label: string }[] = [
  { id: 'jiu-jitsu', label: 'Jiu-Jitsu' },
  { id: 'muay-thai', label: 'Muay Thai' },
  { id: 'boxe', label: 'Boxe' },
]

export default function NovoProfessorPage() {
  const router = useRouter()

  const [fullName,       setFullName]       = useState('')
  const [email,          setEmail]          = useState('')
  const [selectedSports, setSelectedSports] = useState<Sport[]>(['jiu-jitsu'])
  const [belt,           setBelt]           = useState('branca')
  const [degree,         setDegree]         = useState<number>(0)
  const [phone,          setPhone]          = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  const [customPassword, setCustomPassword] = useState('')
  const [showPassword,   setShowPassword]   = useState(false)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [emailFallback, setEmailFallback] = useState<{
    name: string
    email: string
    tempPassword: string
  } | null>(null)

  const teachesJiuJitsu = selectedSports.includes('jiu-jitsu')

  function toggleSport(sport: Sport) {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport],
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSports.length === 0) {
      setError('Selecione pelo menos um esporte que o professor ensina.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const sports = selectedSports.map(sport => ({
        sport,
        belt: sport === 'jiu-jitsu' ? belt : sport === 'muay-thai' ? 'branco' : null,
        degree: sport === 'jiu-jitsu' ? degree : 0,
      }))

      const res = await fetch('/api/students/enroll', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:       fullName,
          email,
          role:            'professor',
          sports,
          phone:           phone           || undefined,
          emergency_phone: emergencyPhone  || undefined,
          ...(customPassword.trim() ? { password: customPassword.trim() } : {}),
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Erro ao cadastrar professor')
      }

      const data = await res.json()
      if (typeof data.temp_password === 'string') {
        setEmailFallback({
          name: fullName,
          email,
          tempPassword: data.temp_password,
        })
        return
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

          <div className="space-y-1.5">
            <label className={labelClass}>
              Senha de acesso
              <span className="ml-1 text-gray-400 font-normal">(opcional — gerada automaticamente se vazio)</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={customPassword}
                onChange={e => setCustomPassword(e.target.value)}
                placeholder="Deixe vazio para gerar automaticamente"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
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

          <div className="space-y-2">
            <Label className={labelClass}>Esportes que ensina</Label>
            <div className="flex flex-wrap gap-2">
              {SPORT_OPTIONS.map(option => {
                const checked = selectedSports.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={loading}
                    onClick={() => toggleSport(option.id)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      checked
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {teachesJiuJitsu && (
            <>
              <div className="space-y-1.5">
                <Label className={labelClass}>Faixa (Jiu-Jitsu)</Label>
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

              <div className="space-y-1.5">
                <label className={labelClass}>Grau</label>
                <select
                  value={degree}
                  onChange={e => setDegree(Number(e.target.value))}
                  className={`${inputClass} w-full px-3`}
                >
                  <option value={0}>Sem grau</option>
                  <option value={1}>1º grau</option>
                  <option value={2}>2º grau</option>
                  <option value={3}>3º grau</option>
                  <option value={4}>4º grau</option>
                </select>
              </div>
            </>
          )}

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
              disabled={loading || !fullName || !email || selectedSports.length === 0}
              className="flex-1 rounded-xl bg-indigo-600 py-6 font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500"
            >
              {loading
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cadastrando...</span>
                : 'Cadastrar professor'}
            </Button>
          </div>

        </form>
      </div>

      {emailFallback && (
        <EnrollPasswordFallback
          name={emailFallback.name}
          email={emailFallback.email}
          tempPassword={emailFallback.tempPassword}
          onContinue={() => router.push('/dashboard/professores?success=true')}
        />
      )}
    </div>
  )
}
