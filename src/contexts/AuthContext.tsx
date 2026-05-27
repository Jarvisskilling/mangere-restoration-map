'use client'

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'
import type { User } from '@/types'

interface AuthState {
  session: Session | null
  user: SupabaseUser | null
  profile: User | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [state, setState] = useState<AuthState>({
    session: null, user: null, profile: null, loading: true,
  })

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // MUST be synchronous — auth-js awaits this callback, so any
        // async work here holds the internal lock and blocks sign-in.
        setState({ session, user: session?.user ?? null, profile: null, loading: false })

        // Fetch profile as a detached side-effect so the lock is released immediately.
        if (session?.user) {
          void (async () => {
            const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single()
            setState(prev => ({ ...prev, profile: data as User | null }))
          })()
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
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

  return (
    <AuthContext.Provider value={{
      ...state,
      isAuthenticated: !!state.user,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
