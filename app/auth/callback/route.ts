import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && user) {
      // Fetch the role exclusively from the profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role

      if (role === 'admin') {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      } else if (role === 'professor') {
        return NextResponse.redirect(`${requestUrl.origin}/professor/checkin`)
      } else if (role === 'aluno') {
        return NextResponse.redirect(`${requestUrl.origin}/aluno/frequencia`)
      }
    }
  }

  // Return the user to the login page if anything fails or no role is found
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
}
