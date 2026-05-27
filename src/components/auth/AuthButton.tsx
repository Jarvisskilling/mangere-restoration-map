'use client'

import { useState } from 'react'
import { LogOut, User } from 'lucide-react'
import Button from '@/components/ui/Button'
import AuthModal from './AuthModal'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function AuthButton() {
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, profile, isAuthenticated, loading, signOut } = useAuth()

  if (loading) {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-white/5" />
  }

  if (!isAuthenticated) {
    return (
      <>
        <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
          Sign in
        </Button>
        <AuthModal open={showModal} onClose={() => setShowModal(false)} />
      </>
    )
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-all hover:border-white/20 hover:bg-white/10"
      >
        {profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={displayName}
            width={20}
            height={20}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
            <User className="h-3 w-3 text-green-400" />
          </div>
        )}
        <span className="max-w-[100px] truncate">{displayName}</span>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#111] p-1 shadow-glass animate-fade-in">
            <div className="px-3 py-2 text-xs text-white/40 border-b border-white/8 mb-1">
              {user?.email}
            </div>
            <button
              onClick={async () => {
                setMenuOpen(false)
                await signOut()
                toast.success('Signed out')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/8 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
