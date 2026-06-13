import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { StudentActions } from '@/components/dashboard/student-actions'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-700',
  azul:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-950 text-amber-200 ring-1 ring-amber-800',
  preta:  'bg-zinc-50 text-zinc-900 ring-1 ring-zinc-300',
}

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: { success?: string; updated?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) {
    redirect('/onboarding')
  }

  const { data: rawAlunos } = await supabase
    .from('profiles')
    .select('id, full_name, phone, belt, photo_url, city, state, created_at')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  const alunos = rawAlunos
    ? await Promise.all(
        rawAlunos.map(async (aluno) => {
          if (aluno.photo_url && !aluno.photo_url.startsWith('http') && !aluno.photo_url.startsWith('data:')) {
            const { data } = await supabase.storage
              .from('student-photos')
              .createSignedUrl(aluno.photo_url, 3600)
            return {
              ...aluno,
              photo_url: data?.signedUrl || null,
            }
          }
          return aluno
        })
      )
    : []

  return (
    <div className="space-y-6">
      {(searchParams.success === 'true' || searchParams.updated === 'true') && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-800/40 bg-emerald-950/40 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-300">
            {searchParams.success === 'true' ? 'Aluno cadastrado com sucesso.' : 'Dados atualizados com sucesso.'}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Alunos</h1>
          <p className="text-sm text-zinc-500">
            {alunos?.length ?? 0} aluno{(alunos?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(alunos?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/alunos/novo">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 rounded-xl shadow-lg shadow-indigo-600/20">
            <Plus className="h-4 w-4" />
            Cadastrar aluno
          </Button>
        </Link>
      </div>

      {/* Table */}
      {alunos && alunos.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-800/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-900/40">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Foto</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Localização</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Faixa</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">Desde</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400"></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-b border-zinc-800/40 last:border-0">
                  <td className="px-4 py-3">
                    {aluno.photo_url ? (
                      <Image
                        src={aluno.photo_url}
                        alt={aluno.full_name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 ring-1 ring-zinc-700">
                        {aluno.full_name
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() ?? '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{aluno.full_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{aluno.phone || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {aluno.city && aluno.state
                      ? `${aluno.city}/${aluno.state}`
                      : aluno.city || aluno.state || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {aluno.belt ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          beltColors[aluno.belt.toLowerCase()] ?? 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {aluno.belt.charAt(0).toUpperCase() + aluno.belt.slice(1)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(aluno.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StudentActions studentId={aluno.id} studentName={aluno.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">Nenhum aluno cadastrado ainda.</p>
          <Link href="/dashboard/alunos/novo" className="mt-3">
            <Button variant="outline" className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro aluno
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
