'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SubscriptionSection } from '@/components/dashboard/subscription-section'
import { Loader2, AlertOctagon, CheckCircle2, Camera } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AcademyData {
  id: string
  name: string
  plan: string | null
  subscription_status: string | null
  trial_ends_at: string | null
  stripe_customer_id: string | null
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<{ full_name: string; phone: string | null; photo_url: string | null } | null>(null)
  const [academy, setAcademy] = useState<AcademyData | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [academyForm, setAcademyForm] = useState({ name: '', sport: 'jiu-jitsu' as 'jiu-jitsu' | 'muay thai' | 'boxe' | 'misto' })
  const [passwordForm, setPasswordForm] = useState({ new_password: '', confirm_password: '' })

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [savingAcademy, setSavingAcademy] = useState(false)
  const [academyError, setAcademyError] = useState<string | null>(null)
  const [academySuccess, setAcademySuccess] = useState(false)

  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserEmail(user.email ?? '')

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone, photo_url, academy_id, role')
          .eq('id', user.id)
          .single()

        if (!profileData || profileData.role !== 'admin') return

        let signedPhotoUrl = profileData.photo_url
        if (
          profileData.photo_url &&
          !profileData.photo_url.startsWith('http') &&
          !profileData.photo_url.startsWith('data:')
        ) {
          const { data } = await supabase.storage
            .from('admin-photos')
            .createSignedUrl(profileData.photo_url, 3600)
          signedPhotoUrl = data?.signedUrl || null
        }

        setProfile({
          full_name: profileData.full_name,
          phone: profileData.phone,
          photo_url: signedPhotoUrl,
        })
        setProfileForm({
          full_name: profileData.full_name,
          phone: profileData.phone || '',
        })

        const { data: academyData } = await supabase
          .from('academies')
          .select('id, name, sport, plan, subscription_status, trial_ends_at, stripe_customer_id')
          .eq('id', profileData.academy_id)
          .single()

        if (academyData) {
          setAcademy(academyData)
          setAcademyForm({
            name: academyData.name,
            sport: (academyData.sport || 'jiu-jitsu') as 'jiu-jitsu' | 'muay thai' | 'boxe' | 'misto',
          })
        }
      } catch (err) {
        console.error('Erro ao carregar dados do perfil:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUri = ev.target?.result as string
      setPhotoPreview(dataUri)
      setPhotoBase64(dataUri)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileError(null)
    setProfileSuccess(false)
    try {
      const body: Record<string, unknown> = {
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      }
      if (photoBase64) body.photo_base64 = photoBase64

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao salvar perfil')
      }
      const data = await res.json()
      setProfileSuccess(true)
      setPhotoBase64(null)

      if (data.photo_url) {
        const supabase = createClient()
        const { data: signedData } = await supabase.storage
          .from('admin-photos')
          .createSignedUrl(data.photo_url, 3600)
        
        setProfile(prev => prev ? {
          ...prev,
          photo_url: signedData?.signedUrl || null,
          full_name: profileForm.full_name,
          phone: profileForm.phone
        } : null)
      } else {
        setProfile(prev => prev ? {
          ...prev,
          full_name: profileForm.full_name,
          phone: profileForm.phone
        } : null)
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveAcademy = async () => {
    setSavingAcademy(true)
    setAcademyError(null)
    setAcademySuccess(false)
    try {
      const res = await fetch('/api/academy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(academyForm),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Erro ao salvar dados da academia')
      }
      setAcademySuccess(true)
      setAcademy(prev => prev ? { ...prev, name: academyForm.name } : null)
    } catch (err) {
      setAcademyError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSavingAcademy(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('As senhas não coincidem')
      return
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setSavingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password })
      if (error) throw error
      setPasswordSuccess(true)
      setPasswordForm({ new_password: '', confirm_password: '' })
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar senha')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configurações de Perfil</h1>
        <p className="text-sm text-gray-500">Gerencie suas credenciais, dados da academia e assinatura.</p>
      </div>

      {/* Seção 1: Meus Dados */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Meus Dados</h2>
          <p className="text-xs text-gray-400">Informações pessoais e foto de perfil do administrador</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-indigo-100 flex items-center justify-center bg-gray-50">
              {photoPreview || profile?.photo_url ? (
                <img
                  src={photoPreview || profile?.photo_url || ''}
                  alt={profileForm.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-gray-400">
                  {profileForm.full_name
                    ?.split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || '?'}
                </span>
              )}
            </div>
            <label
              htmlFor="photo-upload"
              className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white cursor-pointer shadow-lg transition-all duration-200"
            >
              <Camera className="h-4 w-4" />
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome Completo</Label>
              <Input
                value={profileForm.full_name}
                onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Telefone</Label>
              <Input
                value={profileForm.phone}
                onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">E-mail</Label>
              <Input
                value={userEmail}
                disabled
                className="bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200"
              />
            </div>
          </div>
        </div>

        {profileError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
            <AlertOctagon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-xs text-red-600/90">{profileError}</p>
            </div>
          </div>
        )}

        {profileSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-600/90">Dados de perfil atualizados com sucesso.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
          >
            {savingProfile ? 'Salvando...' : 'Salvar Dados'}
          </Button>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Seção 2: Dados da Academia */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Dados da Academia</h2>
          <p className="text-xs text-gray-400">Informações e modalidade principal da academia</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome da Academia</Label>
            <Input
              value={academyForm.name}
              onChange={e => setAcademyForm({ ...academyForm, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Modalidade Principal</Label>
            <Select
              value={academyForm.sport}
              onValueChange={val => setAcademyForm({ ...academyForm, sport: val as 'jiu-jitsu' | 'muay thai' | 'boxe' | 'misto' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jiu-jitsu">Jiu-Jitsu</SelectItem>
                <SelectItem value="muay thai">Muay Thai</SelectItem>
                <SelectItem value="boxe">Boxe</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {academyError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
            <AlertOctagon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-xs text-red-600/90">{academyError}</p>
            </div>
          </div>
        )}

        {academySuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-600/90">Dados da academia atualizados com sucesso.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSaveAcademy}
            disabled={savingAcademy}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
          >
            {savingAcademy ? 'Salvando...' : 'Salvar Academia'}
          </Button>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Seção 3: Segurança */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Segurança</h2>
          <p className="text-xs text-gray-400">Altere sua senha de acesso</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nova Senha</Label>
            <Input
              type="password"
              value={passwordForm.new_password}
              onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmar Nova Senha</Label>
            <Input
              type="password"
              value={passwordForm.confirm_password}
              onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            />
          </div>
        </div>

        {passwordError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
            <AlertOctagon className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
            <div>
              <p className="text-xs text-red-600/90">{passwordError}</p>
            </div>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-600/90">Senha alterada com sucesso.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleChangePassword}
            disabled={savingPassword}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
          >
            {savingPassword ? 'Alterando...' : 'Alterar Senha'}
          </Button>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Seção 4: Assinatura */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Assinatura</h2>
          <p className="text-xs text-gray-400 font-medium">Controle de planos e faturamento</p>
        </div>

        {academy && <SubscriptionSection academy={academy} />}
      </section>
    </div>
  )
}
