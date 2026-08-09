import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { StudentActions } from '@/components/dashboard/student-actions'
import { cn } from '@/lib/utils'

const BELT_LABELS: Record<string, string> = {
  branca: 'Branca', azul: 'Azul', roxa: 'Roxa', marrom: 'Marrom', preta: 'Preta',
  branco: 'Branco', laranja: 'Laranja', 'azul-mt': 'Azul',
  vermelho: 'Vermelho', amarelo: 'Amarelo', verde: 'Verde',
  'marrom-mt': 'Marrom', 'preto-mt': 'Preto',
}

const SPORT_LABELS: Record<string, string> = {
  'jiu-jitsu': 'Jiu-Jitsu',
  'muay-thai': 'Muay Thai',
  'boxe': 'Boxe',
}

const beltColors: Record<string, string> = {
  branca: 'bg-slate-100 text-slate-800 ring-1 ring-slate-300',
  azul:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  roxa:   'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  marrom: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  preta:  'bg-slate-900 text-white ring-1 ring-slate-900',
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

  const storageAdmin = createStorageAdminClient()
  const { data: allStudentSports } = await storageAdmin
    .from('student_sports')
    .select('student_id, sport, belt, degree')
    .eq('academy_id', profile.academy_id)

  const studentSportsMap = new Map<string, Array<{
    sport: string
    belt: string | null
    degree: number
  }>>()
  for (const ss of allStudentSports ?? []) {
    const existing = studentSportsMap.get(ss.student_id) ?? []
    studentSportsMap.set(ss.student_id, [...existing, {
      sport: ss.sport,
      belt: ss.belt,
      degree: ss.degree,
    }])
  }

  const { data: rawAlunos } = await supabase
    .from('profiles')
    .select('id, full_name, phone, belt, degree, photo_url, city, state, created_at, birth_date, sport')
    .eq('academy_id', profile.academy_id)
    .eq('role', 'aluno')
    .order('full_name', { ascending: true })

  const alunos = rawAlunos
    ? await Promise.all(
        rawAlunos.map(async (aluno) => {
          const sports = studentSportsMap.get(aluno.id) ?? [{
            sport: aluno.sport ?? 'jiu-jitsu',
            belt: aluno.belt,
            degree: aluno.degree ?? 0,
          }]
          let photo_url = aluno.photo_url
          if (aluno.photo_url && !aluno.photo_url.startsWith('http') && !aluno.photo_url.startsWith('data:')) {
            const { data } = await supabase.storage
              .from('student-photos')
              .createSignedUrl(aluno.photo_url, 3600)
            photo_url = data?.signedUrl || null
          }
          return {
            ...aluno,
            photo_url,
            sports,
          }
        })
      )
    : []

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {(searchParams.success === 'true' || searchParams.updated === 'true') && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-800">
            {searchParams.success === 'true' ? 'Aluno cadastrado com sucesso.' : 'Dados atualizados com sucesso.'}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg lg:text-xl font-semibold text-zinc-900">Alunos</h1>
          <p className="text-sm text-gray-500">
            {alunos?.length ?? 0} aluno{(alunos?.length ?? 0) !== 1 ? 's' : ''} cadastrado{(alunos?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/alunos/novo">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 rounded-lg">
            <Plus className="h-4 w-4" />
            Cadastrar aluno
          </Button>
        </Link>
      </div>

      {/* Table */}
      {alunos && alunos.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Foto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Localização</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  Graduação
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Desde</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    {aluno.photo_url ? (
                      <Image
                        src={aluno.photo_url}
                        alt={aluno.full_name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 ring-1 ring-gray-200">
                        {aluno.full_name
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() ?? '?'}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{aluno.full_name}</td>
                  <td className="px-4 py-3 text-gray-500">{aluno.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {aluno.city && aluno.state
                      ? `${aluno.city}/${aluno.state}`
                      : aluno.city || aluno.state || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {aluno.sports.map((ss, i) => (
                        <div key={i} className="flex items-center gap-1">
                          {ss.sport !== 'boxe' && ss.belt ? (
                            <span className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              beltColors[ss.belt] ?? 'bg-zinc-100 text-zinc-700'
                            )}>
                              {SPORT_LABELS[ss.sport]} · {BELT_LABELS[ss.belt] ?? ss.belt}
                              {ss.sport === 'jiu-jitsu' && ss.degree > 0 && (
                                <span className="ml-1">{'●'.repeat(ss.degree)}</span>
                              )}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600">
                              {SPORT_LABELS[ss.sport] ?? ss.sport}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
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
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400">Nenhum aluno cadastrado ainda.</p>
          <Link href="/dashboard/alunos/novo" className="mt-3">
            <Button variant="outline" className="border-gray-300 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeiro aluno
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
