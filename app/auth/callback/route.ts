import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
  }

  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  if (!role) {
    return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
  }

  if (role === 'admin') return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
  if (role === 'professor') return NextResponse.redirect(`${requestUrl.origin}/professor/checkin`)
  if (role === 'aluno') return NextResponse.redirect(`${requestUrl.origin}/aluno/frequencia`)

  return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
}
