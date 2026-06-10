import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600/40',
  azul:   'bg-blue-900/50 text-blue-300 ring-1 ring-blue-700/40',
  roxa:   'bg-purple-900/50 text-purple-300 ring-1 ring-purple-700/40',
  marrom: 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-700/40',
  preta:  'bg-zinc-900 text-zinc-100 ring-1 ring-zinc-600',
}

export default async function ProfessorAlunosPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/auth/login')
  if (profile.role !== 'professor' && profile.role !== 'admin') redirect('/auth/login')

  const { data: rawAlunos } = await supabase
    .from('profiles')
    .select('id, full_name, belt, phone, photo_url')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  const alunos = rawAlunos
    ? await Promise.all(
        rawAlunos.map(async (aluno) => {
          if (
            aluno.photo_url &&
            !aluno.photo_url.startsWith('http') &&
            !aluno.photo_url.startsWith('data:')
          ) {
            const { data } = await supabase.storage
              .from('student-photos')
              .createSignedUrl(aluno.photo_url, 3600)
            return { ...aluno, photo_url: data?.signedUrl || null }
          }
          return aluno
        })
      )
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Alunos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} na academia
        </p>
      </div>

      {alunos.length > 0 ? (
        <div className="space-y-2">
          {alunos.map(aluno => {
            const beltCls = beltColors[aluno.belt?.toLowerCase() ?? 'branca']
              ?? 'bg-zinc-700 text-zinc-300'
            const initials = aluno.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() ?? '?'

            return (
              <div
                key={aluno.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
              >
                {aluno.photo_url ? (
                  <Image
                    src={aluno.photo_url}
                    alt={aluno.full_name}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400 ring-1 ring-zinc-700">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{aluno.full_name}</p>
                  {aluno.phone && (
                    <p className="text-xs text-zinc-500 truncate">{aluno.phone}</p>
                  )}
                </div>
                {aluno.belt && (
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${beltCls}`}>
                    {aluno.belt.charAt(0).toUpperCase() + aluno.belt.slice(1)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-sm text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
