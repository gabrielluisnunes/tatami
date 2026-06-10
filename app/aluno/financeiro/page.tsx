import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle, AlertCircle } from 'lucide-react'

const statusConfig = {
  paid:    { label: 'Pago',      cls: 'bg-emerald-950/50 text-emerald-400 border-emerald-800/30' },
  pending: { label: 'Pendente',  cls: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/30' },
  overdue: { label: 'Em atraso', cls: 'bg-red-950/50 text-red-400 border-red-800/30' },
}

function formatLocalDate(dateStr: string) {
  if (!dateStr) return '—'
  if (dateStr.includes('T') || dateStr.includes(':')) {
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

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
        <h1 className="text-2xl font-bold text-zinc-100">Financeiro</h1>
        <p className="text-sm text-zinc-500 mt-1">Seus pagamentos e cobranças</p>
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
          <div className="space-y-2">
            {financials.map(f => {
              const cfg = statusConfig[f.status as keyof typeof statusConfig]
                ?? statusConfig.pending
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {f.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Venc. {formatLocalDate(f.due_date)}
                      {f.paid_at && ` · Pago em ${formatLocalDate(f.paid_at)}`}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
