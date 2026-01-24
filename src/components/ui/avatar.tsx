'use client';

import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const iconSizes = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  // Generate a consistent color based on name
  const colors = [
    'bg-red-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-yellow-600',
    'bg-lime-600',
    'bg-green-600',
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-sky-600',
    'bg-blue-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-purple-600',
    'bg-fuchsia-600',
    'bg-pink-600',
    'bg-rose-600',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const showImage = src && !hasError;
  const showInitials = !showImage && name;

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden flex items-center justify-center shrink-0',
        showInitials ? getColorFromName(name) : 'bg-zinc-800',
        sizeClasses[size],
        className
      )}
    >
      {showImage && (
        <img
          src={src}
          alt={alt || name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      )}

      {showInitials && (
        <span className="font-medium text-white/90">
          {getInitials(name)}
        </span>
      )}

      {!showImage && !showInitials && (
        <User size={iconSizes[size]} className="text-zinc-500" />
      )}
    </div>
  );
}

// Avatar group for showing multiple avatars stacked
interface AvatarGroupProps {
  avatars: Array<{ src?: string | null; name?: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapClasses = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((avatar, i) => (
        <Avatar
          key={i}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className={cn(
            'ring-2 ring-zinc-950',
            i > 0 && overlapClasses[size]
          )}
        />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'rounded-full bg-zinc-800 flex items-center justify-center ring-2 ring-zinc-950',
            sizeClasses[size],
            overlapClasses[size]
          )}
        >
          <span className="text-zinc-400 font-medium">+{remaining}</span>
        </div>
      )}
    </div>
  );
}
