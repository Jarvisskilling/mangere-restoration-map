import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100',
          {
            'bg-green-500 text-black hover:bg-green-400 active:bg-green-600 shadow-glow-green hover:shadow-glow-green-lg':
              variant === 'primary',
            'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 active:bg-white/5':
              variant === 'secondary',
            'text-white/70 hover:text-white hover:bg-white/5 active:bg-white/10':
              variant === 'ghost',
            'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20':
              variant === 'danger',
          },
          {
            'h-7 px-3 text-xs': size === 'sm',
            'h-9 px-4 text-sm': size === 'md',
            'h-11 px-6 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
