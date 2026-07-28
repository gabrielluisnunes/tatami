import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CompletarPerfilForm } from '@/components/aluno/completar-perfil-form'

export default async function CompletarPerfilPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, face_descriptor, payment_due_day')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')
  if (profile.role !== 'aluno') redirect('/dashboard')

  const hasFaceDescriptor = !!profile?.face_descriptor
  const hasPaymentDueDay = !!profile?.payment_due_day

  // Se já tem tudo completo, redirecionar para frequencia
  if (hasFaceDescriptor && hasPaymentDueDay) {
    redirect('/aluno/frequencia')
  }

  const firstName = profile.full_name?.split(' ')[0] ?? 'aluno'

  return (
    <div className="mx-auto max-w-md">
      <CompletarPerfilForm firstName={firstName} hasFaceDescriptor={hasFaceDescriptor} />
    </div>
  )
}
