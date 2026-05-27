'use client'

import { useState } from 'react'
import { Mail, Lock, User, Chrome } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

type Mode = 'login' | 'signup'

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const withTimeout = <T,>(p: Promise<T>, ms = 15000): Promise<T> =>
      Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Request timed out — check your connection and try again.')), ms))])

    try {
      if (mode === 'login') {
        await withTimeout(signInWithEmail(email, password))
        toast.success('Welcome back!')
        onClose()
      } else {
        await withTimeout(signUpWithEmail(email, password, fullName))
        toast.success('Check your email to confirm your account, then sign in.')
        onClose()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setErrorMsg(
        msg.includes('Email not confirmed')
          ? 'Confirm your email first, or disable "Confirm email" in Supabase → Auth → Providers → Email.'
          : msg.includes('already registered') || msg.includes('already been registered')
          ? 'An account with this email already exists. Try signing in instead.'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch {
      toast.error('Google sign-in failed')
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10">
            <span className="text-2xl">🌿</span>
          </div>
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login' ? 'Welcome back' : 'Join the community'}
          </h2>
          <p className="mt-1 text-sm text-white/40">
            {mode === 'login' ? 'Sign in to contribute to restoration projects' : 'Create an account to start contributing'}
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="w-full mb-4"
          onClick={handleGoogle}
          type="button"
        >
          <Chrome className="h-4 w-4" />
          Continue with Google
        </Button>

        <div className="relative my-4 flex items-center">
          <div className="flex-1 border-t border-white/10" />
          <span className="mx-3 text-xs text-white/30">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Full name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-green-500/50 focus:bg-white/8"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-green-500/50 focus:bg-white/8"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-green-500/50 focus:bg-white/8"
            />
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <Button variant="primary" size="lg" className="w-full" loading={loading} type="submit">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-white/30">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </Modal>
  )
}
