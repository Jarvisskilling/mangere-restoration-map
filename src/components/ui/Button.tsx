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
            'bg-[#5f8f49] text-white hover:bg-[#4f7f3f] active:bg-[#467238] shadow-[0_12px_28px_rgba(95,143,73,0.22)] hover:shadow-[0_16px_36px_rgba(95,143,73,0.28)]':
              variant === 'primary',
            'bg-white/70 text-[#183225] border border-[#5c6f55]/15 hover:bg-white hover:border-[#5c6f55]/25 active:bg-white/80':
              variant === 'secondary',
            'text-[#183225]/65 hover:text-[#183225] hover:bg-[#5f8f49]/8 active:bg-[#5f8f49]/12':
              variant === 'ghost',
            'bg-red-500/8 text-red-700 border border-red-500/18 hover:bg-red-500/14':
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
