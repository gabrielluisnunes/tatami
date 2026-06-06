'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PhotoCapture } from '@/components/photo-capture'

export default function NovoAlunoPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [belt, setBelt] = useState('branca')
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handlePhotoCapture = (base64: string, descriptor: number[]) => {
    setPhotoBase64(base64)
    setFaceDescriptor(descriptor)
  }

  const handlePhotoClear = () => {
    setPhotoBase64(null)
    setFaceDescriptor(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!photoBase64 || !faceDescriptor) {
      setError('A foto com detecção de rosto é obrigatória.')
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
          password,
          role: 'aluno',           // sempre fixo como 'aluno' nesta página
          belt,
          phone: phone || undefined,
          photo_base64: photoBase64,
          face_descriptor: faceDescriptor,
        }),
      })

      if (response.status === 409) {
        setError('Este email já está cadastrado.')
        return
      }

      if (!response.ok) {
        throw new Error('Erro ao cadastrar')
      }

      // Sucesso → volta para listagem com flag de sucesso
      router.push('/dashboard/alunos?success=true')
    } catch {
      setError('Erro ao cadastrar aluno. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/alunos">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-zinc-800
                       text-zinc-400 hover:bg-zinc-800
                       hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Cadastrar aluno
          </h1>
          <p className="text-sm text-zinc-500">
            O aluno receberá acesso com o email e senha informados.
          </p>
        </div>
      </div>

      {/* Card do formulário */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Captura de Foto (IA) */}
          <PhotoCapture
            onCapture={handlePhotoCapture}
            onClear={handlePhotoClear}
          />

          {/* Nome completo */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs font-semibold text-zinc-400">
              Nome completo
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Ex: Carlos Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              required
              minLength={2}
              className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-400">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="aluno@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Senha temporária */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-zinc-400">
              Senha temporária
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              minLength={6}
              className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
            />
            <p className="text-[11px] text-zinc-600">
              O aluno poderá alterar a senha após o primeiro acesso.
            </p>
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-semibold text-zinc-400">
              Telefone <span className="text-zinc-600 font-normal">(opcional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white placeholder-zinc-600 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Faixa */}
          <div className="space-y-1.5">
            <Label htmlFor="belt" className="text-xs font-semibold text-zinc-400">
              Faixa atual
            </Label>
            <Select
              value={belt}
              onValueChange={(v) => v && setBelt(v)}
              disabled={loading}
            >
              <SelectTrigger
                id="belt"
                className="rounded-xl border-zinc-800/80 bg-zinc-950/60 py-5 text-white"
              >
                <SelectValue placeholder="Selecione a faixa" />
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

          {/* Erro */}
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
                className="w-full rounded-xl border-zinc-700 py-6 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || !fullName || !email || !password || !photoBase64 || !faceDescriptor}
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
