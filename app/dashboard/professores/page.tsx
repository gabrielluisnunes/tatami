import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { ProfessorActions } from '@/components/dashboard/professor-actions'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600/40',
  azul:   'bg-blue-900/50 text-blue-300 ring-1 ring-blue-700/40',
  roxa:   'bg-purple-900/50 text-purple-300 ring-1 ring-purple-700/40',
  marrom: 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/40',
  preta:  'bg-zinc-900 text-zinc-100 ring-1 ring-zinc-600',
}

export default async function ProfessoresPage({
  searchParams,
}: {
  searchParams: { success?: string; updated?: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'admin') redirect('/dashboard')

  const { data: rawProfessores } = await supabase
    .from('profiles')
    .select('id, full_name, phone, belt, photo_url, city, state, created_at')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'professor')
    .order('full_name', { ascending: true })

  const professores = rawProfessores
    ? await Promise.all(
        rawProfessores.map(async (prof) => {
          if (
            prof.photo_url &&
            !prof.photo_url.startsWith('http') &&
            !prof.photo_url.startsWith('data:')
          ) {
            const { data } = await supabase.storage
              .from('student-photos')
              .createSignedUrl(prof.photo_url, 3600)
            return { ...prof, photo_url: data?.signedUrl || null }
          }
          return prof
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
            {searchParams.success === 'true'
              ? 'Professor cadastrado com sucesso.'
              : 'Dados atualizados com sucesso.'}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Professores</h1>
          <p className="text-sm text-zinc-500">
            {professores.length} professor{professores.length !== 1 ? 'es' : ''} cadastrado{professores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/professores/novo">
          <Button className="gap-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500">
            <Plus className="h-4 w-4" />
            Cadastrar professor
          </Button>
        </Link>
      </div>

      {professores.length > 0 ? (
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
              {professores.map(prof => (
                <tr key={prof.id} className="border-b border-zinc-800/40 last:border-0">
                  <td className="px-4 py-3">
                    {prof.photo_url ? (
                      <Image
                        src={prof.photo_url}
                        alt={prof.full_name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 ring-1 ring-zinc-700">
                        {prof.full_name
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() ?? '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{prof.full_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{prof.phone || '—'}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {prof.city && prof.state
                      ? `${prof.city}/${prof.state}`
                      : prof.city || prof.state || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {prof.belt ? (
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        beltColors[prof.belt.toLowerCase()] ?? 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {prof.belt.charAt(0).toUpperCase() + prof.belt.slice(1)}
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(prof.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ProfessorActions professorId={prof.id} professorName={prof.full_name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">Nenhum professor cadastrado ainda.</p>
          <Link href="/dashboard/professores/novo" className="mt-3">
            <Button variant="outline" className="gap-2 rounded-xl border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro professor
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
