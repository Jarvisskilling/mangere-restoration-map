'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User } from '@/types'

interface AuthState {
  session: Session | null
  user: SupabaseUser | null
  profile: User | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    profile: null,
    loading: true,
  })

  // Create client once — avoids infinite effect re-runs from a new object each render
  const supabase = useMemo(() => createClient(), [])

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    return data as User | null
  }, [supabase])

  useEffect(() => {
    let cancelled = false

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return
        let profile: User | null = null
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
        }
        if (!cancelled) setState({ session, user: session?.user ?? null, profile, loading: false })
      })
      .catch(() => {
        if (!cancelled) setState({ session: null, user: null, profile: null, loading: false })
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        let profile: User | null = null
        if (session?.user) {
          profile = await fetchProfile(session.user.id)
        }
        setState({ session, user: session?.user ?? null, profile, loading: false })
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    ...state,
    isAuthenticated: !!state.user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  }
}
