import { createClient, createStorageAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'
import FinanceiroClient from '@/components/aluno/financeiro-client'

export default async function AlunoFinanceiroPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.academy_id) redirect('/onboarding')
  if (profile.role !== 'aluno') redirect('/dashboard')

  // Buscar se a academia tem chave PIX configurada
  const adminSupabase = createStorageAdminClient()
  const { data: academy } = await adminSupabase
    .from('academies')
    .select('pix_key, pix_key_type')
    .eq('id', profile.academy_id)
    .single()

  // Todos os registros financeiros do aluno, mais recentes primeiro
  const { data: financials } = await supabase
    .from('financials')
    .select('id, amount, due_date, paid_at, status')
    .eq('student_id', user.id)
    .order('due_date', { ascending: false })

  const hasOverdue = financials?.some(f => f.status === 'overdue') ?? false
  const overdueTotal = financials
    ?.filter(f => f.status === 'overdue')
    .reduce((sum, f) => sum + f.amount, 0) ?? 0

  return (
    <div className="px-4 pt-8 pb-24 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Pagamentos</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">Financeiro</h1>
      </div>

      {/* Card de status atual */}
      {hasOverdue ? (
        <div className="rounded-2xl border border-red-800/40 bg-red-950/20 p-5 flex gap-4 items-start">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-900/40">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-red-300">Pagamento em atraso</p>
            <p className="text-sm text-red-400/80 mt-0.5">
              Valor total em atraso:{' '}
              <span className="font-bold text-red-300">
                {overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
            <p className="text-xs text-red-500 mt-1">
              Entre em contato com a academia para regularizar.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-800/30 bg-emerald-950/20 p-5 flex gap-4 items-center">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-900/40">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Pagamentos em dia</p>
            <p className="text-sm text-emerald-400/70 mt-0.5">Nenhuma pendência no momento.</p>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Histórico
        </h2>

        {!financials || financials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center text-zinc-600">
            <p className="text-sm">Nenhum registro financeiro encontrado.</p>
          </div>
        ) : (
          <FinanceiroClient financials={financials} hasPix={!!academy?.pix_key} />
        )}
      </div>
    </div>
  )
}
