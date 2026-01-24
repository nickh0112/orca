'use client';

import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count?: number;
  showZero?: boolean;
  max?: number;
  variant?: 'default' | 'dot' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  children?: React.ReactNode;
}

export function NotificationBadge({
  count = 0,
  showZero = false,
  max = 99,
  variant = 'default',
  size = 'sm',
  className,
  children,
}: NotificationBadgeProps) {
  const showBadge = count > 0 || showZero;
  const displayCount = count > max ? `${max}+` : count;

  if (!showBadge && !children) return null;

  const badgeContent = (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold',
        // Variant styles
        variant === 'default' && 'bg-red-500 text-white',
        variant === 'outline' && 'bg-transparent border-2 border-red-500 text-red-500',
        variant === 'dot' && 'bg-red-500',
        // Size styles
        size === 'sm' && (variant === 'dot' ? 'w-2 h-2' : 'min-w-[18px] h-[18px] text-[10px] px-1'),
        size === 'md' && (variant === 'dot' ? 'w-2.5 h-2.5' : 'min-w-[22px] h-[22px] text-xs px-1.5'),
        // Shape
        'rounded-full',
        className
      )}
    >
      {variant !== 'dot' && displayCount}
    </span>
  );

  // If no children, just return the badge
  if (!children) {
    return badgeContent;
  }

  // If children exist, position badge relative to them
  return (
    <div className="relative inline-flex">
      {children}
      {showBadge && (
        <span
          className={cn(
            'absolute inline-flex items-center justify-center font-semibold',
            // Variant styles
            variant === 'default' && 'bg-red-500 text-white',
            variant === 'outline' && 'bg-transparent border-2 border-red-500 text-red-500',
            variant === 'dot' && 'bg-red-500',
            // Size styles
            size === 'sm' && (variant === 'dot' ? 'w-2 h-2' : 'min-w-[16px] h-[16px] text-[9px] px-1'),
            size === 'md' && (variant === 'dot' ? 'w-2.5 h-2.5' : 'min-w-[20px] h-[20px] text-[10px] px-1'),
            // Position
            '-top-1 -right-1',
            // Shape
            'rounded-full',
            // Ring for better visibility on different backgrounds
            'ring-2 ring-zinc-950'
          )}
        >
          {variant !== 'dot' && displayCount}
        </span>
      )}
    </div>
  );
}

// Pulse animation variant for urgent notifications
export function NotificationBadgePulse({
  ...props
}: Omit<NotificationBadgeProps, 'variant'>) {
  return (
    <div className="relative inline-flex">
      <NotificationBadge {...props} variant="dot" />
      <span className="absolute top-0 right-0 -mt-1 -mr-1 w-2 h-2 bg-red-400 rounded-full animate-ping" />
    </div>
  );
}
