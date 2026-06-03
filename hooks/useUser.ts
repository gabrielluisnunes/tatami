import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types'

interface UseUserReturn {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

export function useUser(): UseUserReturn {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, academy_id, belt, photo_url, created_at')
        .eq('id', userId)
        .single()

      if (error || !data) {
        setProfile(null)
      } else {
        setProfile(data as Profile)
      }
    } catch (err) {
      setProfile(null)
    }
  }, [supabase])

  const handleAuthStateChange = useCallback(async (sessionUser: User | null) => {
    setUser(sessionUser)
    if (sessionUser) {
      await fetchProfile(sessionUser.id)
    } else {
      setProfile(null)
    }
    setLoading(false)
  }, [fetchProfile])

  useEffect(() => {
    // Initial fetch
    const initAuth = async () => {
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser()
        await handleAuthStateChange(sessionUser)
      } catch (err) {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await handleAuthStateChange(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, handleAuthStateChange])

  const signOut = async () => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      router.push('/auth/login')
    } catch (err) {
      // Fallback redirect
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    profile,
    loading,
    signOut,
  }
}
