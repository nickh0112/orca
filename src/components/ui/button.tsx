import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-zinc-50 text-zinc-900 hover:bg-zinc-200': variant === 'primary',
            'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700':
              variant === 'secondary',
            'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'h-8 px-3 text-sm rounded-md': size === 'sm',
            'h-10 px-4 text-sm rounded-lg': size === 'md',
            'h-12 px-6 text-base rounded-lg': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
