import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { EditAlunoForm } from '@/components/dashboard/edit-aluno-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditarAlunoPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.academy_id || adminProfile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { data: aluno } = await supabase
    .from('profiles')
    .select('id, full_name, phone, emergency_phone, belt, cep, address, neighborhood, city, state')
    .eq('id', params.id)
    .eq('academy_id', adminProfile.academy_id)
    .eq('role', 'aluno')
    .single()

  if (!aluno) notFound()

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/alunos">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Editar aluno</h1>
          <p className="text-sm text-zinc-500">{aluno.full_name}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <EditAlunoForm studentId={params.id} initialData={aluno} />
      </div>
    </div>
  )
}
