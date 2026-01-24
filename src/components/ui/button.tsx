import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const isIconSize = size === 'icon' || size === 'icon-sm' || size === 'icon-lg';

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant styles
          {
            'bg-zinc-50 text-zinc-900 hover:bg-zinc-200': variant === 'primary',
            'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700':
              variant === 'secondary',
            'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100': variant === 'outline',
          },
          // Size styles - regular buttons
          !isIconSize && {
            'h-8 px-3 text-sm rounded-md': size === 'sm',
            'h-10 px-4 text-sm rounded-lg': size === 'md',
            'h-12 px-6 text-base rounded-lg': size === 'lg',
          },
          // Size styles - icon buttons (square)
          isIconSize && {
            'h-7 w-7 rounded-md': size === 'icon-sm',
            'h-9 w-9 rounded-lg': size === 'icon',
            'h-11 w-11 rounded-lg': size === 'icon-lg',
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

// Icon button shortcut component
interface IconButtonProps extends Omit<ButtonProps, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  icon: React.ReactNode;
  label?: string; // For accessibility
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', variant = 'ghost', className, ...props }, ref) => {
    const sizeMap = {
      sm: 'icon-sm' as const,
      md: 'icon' as const,
      lg: 'icon-lg' as const,
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={sizeMap[size]}
        className={className}
        aria-label={label}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
