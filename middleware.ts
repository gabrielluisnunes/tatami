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

  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isProfessorRoute = pathname.startsWith('/professor')
  const isAlunoRoute = pathname.startsWith('/aluno')
  const isOnboardingRoute = pathname.startsWith('/onboarding')
  const isProtectedRoute = isDashboardRoute || isProfessorRoute || isAlunoRoute || isOnboardingRoute

  if (!isProtectedRoute) {
    return supabaseResponse
  }

  // 1. Sem usuário → login
  if (!user) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 2. Busca profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, academy_id')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  const academyId = profile?.academy_id

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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
