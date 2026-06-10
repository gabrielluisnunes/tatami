import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompletarPerfilForm } from '@/components/aluno/completar-perfil-form'

export default async function CompletarPerfilPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, face_descriptor')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')
  if (profile.role !== 'aluno') redirect('/dashboard')

  // Já tem foto → pula para o portal
  if (profile.face_descriptor) redirect('/aluno/frequencia')

  const firstName = profile.full_name?.split(' ')[0] ?? 'aluno'

  return (
    <div className="mx-auto max-w-md">
      <CompletarPerfilForm firstName={firstName} />
    </div>
  )
}
