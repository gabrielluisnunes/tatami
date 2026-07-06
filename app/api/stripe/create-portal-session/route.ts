import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Buscar perfil e verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin' || !profile.academy_id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Obter stripe_customer_id da academia
  const { data: academy, error: academyError } = await supabase
    .from('academies')
    .select('stripe_customer_id')
    .eq('id', profile.academy_id)
    .single()

  if (academyError || !academy) {
    return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
  }

  if (!academy.stripe_customer_id) {
    return NextResponse.json({ error: 'Você ainda não possui uma assinatura vinculada' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? 'https://tatami.app'

  try {
    // Criar sessão de portal de faturamento
    const session = await stripe.billingPortal.sessions.create({
      customer: academy.stripe_customer_id,
      return_url: `${origin}/dashboard/assinatura`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const stripeErr = err as { message?: string; code?: string; type?: string }
    console.error('Stripe portal error:', stripeErr?.message, stripeErr?.code, stripeErr?.type)

    if (stripeErr?.code === 'resource_missing') {
      return NextResponse.json(
        { error: 'Assinatura não encontrada no ambiente atual. Por favor, faça uma nova assinatura.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro ao abrir o painel de faturamento' }, { status: 500 })
  }
}
