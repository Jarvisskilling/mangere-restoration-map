'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export default function Modal({ open, onClose, title, children, size = 'lg', className }: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center p-4 animate-fade-in"
      style={{ zIndex: 99999 }}
    >
      <div className="absolute inset-0 bg-[#1f2f22]/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'friendly-modal relative w-full rounded-3xl border border-[#5c6f55]/15 bg-[#fffaf1]/95 shadow-[0_24px_80px_rgba(65,75,55,0.24)] backdrop-blur-xl animate-fade-up overflow-hidden',
          {
            'max-w-sm': size === 'sm',
            'max-w-lg': size === 'md',
            'max-w-2xl': size === 'lg',
            'max-w-4xl': size === 'xl',
            'max-w-[95vw] h-[90vh]': size === 'full',
          },
          className
        )}
        style={{ zIndex: 1 }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[#5c6f55]/12 px-6 py-4">
            <h2 className="text-base font-semibold text-[#183225]">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#183225]/45 transition-colors hover:bg-[#5f8f49]/10 hover:text-[#183225]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
