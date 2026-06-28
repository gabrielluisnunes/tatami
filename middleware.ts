import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          ) 
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>        
            supabaseResponse.cookies.set(name, value, options)    
          )
        },
      },
    } 
  ) 
  
  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const { pathname } = url
  
  const isDashboardRoute  = pathname.startsWith('/dashboard')
  const isProfessorRoute  = pathname.startsWith('/professor')
  const isAlunoRoute      = pathname.startsWith('/aluno')
  const isOnboardingRoute = pathname.startsWith('/onboarding')
  const isProtectedRoute  = isDashboardRoute || isProfessorRoute || isAlunoRoute || isOnboardingRoute

  if (!isProtectedRoute) {
    return supabaseResponse
  } 
  
  // 1. Sem usuário → login
  if (!user) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  } 
  
  // 2. Busca profile
  // Inclui face_descriptor somente para rotas /aluno/ para não inflar requests
  // de admin/professor com um array de 128 floats desnecessariamente
  const { data: profile } = isAlunoRoute
    ? await supabase
        .from('profiles')
        .select('role, academy_id, face_descriptor, payment_due_day')
        .eq('id', user.id)
        .single()
    : await supabase
        .from('profiles')
        .select('role, academy_id')
        .eq('id', user.id)
        .single()
    
  const role           = profile?.role
  const academyId      = profile?.academy_id
  const faceDescriptor = (profile as { face_descriptor?: number[] | null } | null)?.face_descriptor
  const paymentDueDay  = (profile as { payment_due_day?: number | null } | null)?.payment_due_day

  // 3. Usuário sem role (novo) → sempre onboarding
  if (!role) {
    if (isOnboardingRoute) return supabaseResponse
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  } 
  
  // 4. Admin sem academia → onboarding obrigatório
  if (role === 'admin' && !academyId && !isOnboardingRoute) { 
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  } 

  // 4.5 Bloqueio de inadimplência para admins no dashboard
  if (role === 'admin' && academyId && isDashboardRoute && pathname !== '/dashboard/assinatura') {
    const { data: academy } = await supabase
      .from('academies')
      .select('subscription_status, plan, stripe_customer_id')
      .eq('id', academyId)
      .single()

    const status = academy?.subscription_status
    const isTrialing = status === 'trial' || status === 'trialing'
    const hasNeverCompletedCheckout = !academy?.plan || !academy?.stripe_customer_id

    if (
      status === 'past_due' ||
      status === 'unpaid' ||
      status === 'canceled' ||
      status === 'incomplete' ||
      status === 'incomplete_expired' ||
      (isTrialing && hasNeverCompletedCheckout)
    ) {
      if (!url.pathname.startsWith('/dashboard/assinatura') && !url.pathname.startsWith('/onboarding')) {
        url.pathname = '/dashboard/assinatura'
        return NextResponse.redirect(url)
      }
    }
  }
  
  // 5. Professor/aluno NUNCA acessa onboarding
  if (isOnboardingRoute && role !== 'admin') {
    if (role === 'professor') url.pathname = '/professor/checkin'
    else if (role === 'aluno') url.pathname = '/aluno/frequencia'
    else url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  } 
  
  // 6. Proteção por role
  if (isDashboardRoute && role !== 'admin') {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  } 
  
  if (isProfessorRoute && role !== 'professor' && role !== 'admin') {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  } 
  
  if (isAlunoRoute && role !== 'aluno') {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  } 
  
  // 7. Aluno sem foto cadastrada → completar perfil obrigatório
  // Só redireciona para /aluno/* que não seja a própria tela de completar perfil 
  if (
    role === 'aluno' &&
    isAlunoRoute &&
    (!faceDescriptor || !paymentDueDay) &&
    pathname !== '/aluno/completar-perfil'
  ) {
    url.pathname = '/aluno/completar-perfil'
    return NextResponse.redirect(url)
  } 
  
  return supabaseResponse
} 

export const config = {
  matcher: [ 
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
