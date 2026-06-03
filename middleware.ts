import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // We read from process.env directly here to avoid potential issues during static generation or build-time runs
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const { pathname } = url

  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isProfessorRoute = pathname.startsWith('/professor')
  const isAlunoRoute = pathname.startsWith('/aluno')

  if (isDashboardRoute || isProfessorRoute || isAlunoRoute) {
    if (!user) {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (!role) {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    // Role-based routing rules
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
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets like svg, png, jpg, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
