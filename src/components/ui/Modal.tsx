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
      className="fixed inset-0 flex items-end justify-center p-3 animate-fade-in sm:items-center sm:p-4"
      style={{ zIndex: 99999 }}
    >
      <div className="absolute inset-0 bg-[#1f2f22]/24 backdrop-blur-md" onClick={onClose} />
      <div
        className={cn(
          'friendly-modal liquid-glass-surface relative w-full overflow-hidden rounded-[24px] animate-fade-up sm:rounded-[28px]',
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
          <div className="flex items-center justify-between border-b border-white/45 bg-white/24 px-6 py-4 backdrop-blur-xl">
            <h2 className="text-base font-semibold text-[#183225]">{title}</h2>
            <button
              onClick={onClose}
              className="liquid-glass-control rounded-xl p-1.5 text-[#183225]/45 transition-[background-color,color,transform] duration-150 ease-out hover:text-[#183225] active:scale-[0.97]"
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
