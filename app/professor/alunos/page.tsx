import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'

const beltColors: Record<string, string> = {
  branca: 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200',
  azul:   'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
  roxa:   'bg-purple-100 text-purple-800 ring-1 ring-purple-200',
  marrom: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  preta:  'bg-zinc-900 text-white ring-1 ring-zinc-900',
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

  // createStorageAdminClient() para ler perfis de outros usuários — bypassa RLS
  const adminSupabase = createStorageAdminClient()

  const { data: rawAlunos } = await adminSupabase
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
            const { data } = await adminSupabase.storage
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
        <h1 className="text-xl font-semibold text-zinc-900">Alunos</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} na academia
        </p>
      </div>

      {alunos.length > 0 ? (
        <div className="space-y-2">
          {alunos.map(aluno => {
            const beltCls = beltColors[aluno.belt?.toLowerCase() ?? 'branca']
              ?? 'bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200'
            const initials = aluno.full_name
              ?.split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() ?? '?'

            return (
              <div
                key={aluno.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3"
              >
                {aluno.photo_url ? (
                  <Image
                    src={aluno.photo_url}
                    alt={aluno.full_name}
                    width={36}
                    height={36}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 ring-1 ring-zinc-200">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{aluno.full_name}</p>
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
          <p className="text-sm text-zinc-500">Nenhum aluno cadastrado ainda.</p>
        </div>
      )}
    </div>
  )
}
