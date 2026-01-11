'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedGradientProps {
  className?: string;
}

export function AnimatedGradient({ className }: AnimatedGradientProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      {/* Primary gradient orb */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30 animate-gradient-1"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          top: '10%',
          left: '20%',
          filter: 'blur(80px)',
        }}
      />

      {/* Secondary gradient orb */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-25 animate-gradient-2"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
          bottom: '20%',
          right: '10%',
          filter: 'blur(60px)',
        }}
      />

      {/* Tertiary accent orb */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-20 animate-gradient-3"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Diagonal gradient sweep */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(234deg, rgba(14, 14, 14, 0) 35%, #0E0E0E 63%)',
        }}
      />
    </div>
  );
}
