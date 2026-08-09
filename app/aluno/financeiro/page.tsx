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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Financeiro</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Pagamentos e pendências</p>
      </div>

      {/* Card de status atual */}
      {hasOverdue ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex gap-4 items-start">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Pagamento em atraso</p>
            <p className="text-sm text-red-700 mt-0.5">
              Valor total em atraso:{' '}
              <span className="font-bold">
                {overdueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </p>
            <p className="text-xs text-red-600 mt-1">
              Entre em contato com a academia para regularizar.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 flex gap-4 items-center">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-800">Pagamentos em dia</p>
            <p className="text-sm text-emerald-700 mt-0.5">Nenhuma pendência no momento.</p>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Histórico
        </h2>

        {!financials || financials.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white py-16 text-center">
            <p className="text-sm text-zinc-500">Nenhum registro financeiro encontrado.</p>
          </div>
        ) : (
          <FinanceiroClient financials={financials} hasPix={!!academy?.pix_key} />
        )}
      </div>
    </div>
  )
}
