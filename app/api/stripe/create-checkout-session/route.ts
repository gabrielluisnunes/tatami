import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { stripe, getPlanKeyByPriceId } from '@/lib/stripe'
import { z } from 'zod'

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  academyId: z.string().uuid(),
})

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

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  let body: z.infer<typeof checkoutSchema>
  try {
    body = checkoutSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { priceId, academyId } = body

  // Garantir que o usuário administra esta academia
  if (profile.academy_id !== academyId) {
    return NextResponse.json({ error: 'Acesso negado à academia' }, { status: 403 })
  }

  const planKey = getPlanKeyByPriceId(priceId)
  if (!planKey) {
    return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
  }

  // Obter dados da academia
  const { data: academy, error: academyError } = await supabase
    .from('academies')
    .select('name, stripe_customer_id')
    .eq('id', academyId)
    .single()

  if (academyError || !academy) {
    return NextResponse.json({ error: 'Academia não encontrada' }, { status: 404 })
  }

  let stripeCustomerId = academy.stripe_customer_id

  if (!stripeCustomerId) {
    try {
      // Criar cliente no Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: academy.name,
        metadata: {
          academy_id: academyId,
        },
      })
      stripeCustomerId = customer.id

      // Atualizar stripe_customer_id no DB usando admin client
      const adminSupabase = createAdminClient()
      await adminSupabase
        .from('academies')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', academyId)
    } catch (err) {
      console.error('Erro ao criar cliente no Stripe:', err)
      return NextResponse.json({ error: 'Erro ao criar cliente no Stripe' }, { status: 500 })
    }
  }

  const origin = request.headers.get('origin') ?? 'https://tatami.app'

  try {
    // Criar sessão de checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 5,
      },
      metadata: {
        academy_id: academyId,
        plan_type: planKey,
      },
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/onboarding`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Erro ao criar sessão de checkout:', err)
    return NextResponse.json({ error: 'Erro ao criar sessão de checkout' }, { status: 500 })
  }
}
