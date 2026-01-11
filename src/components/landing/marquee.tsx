'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';

interface MarqueeProps {
  items: string[];
  className?: string;
  speed?: 'slow' | 'normal' | 'fast';
}

export function Marquee({ items, className, speed = 'normal' }: MarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

  const baseDuration = {
    slow: 60,
    normal: 40,
    fast: 25,
  }[speed];

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Continuous marquee animation
      const tl = gsap.timeline({ repeat: -1 });

      tl.to([track1Ref.current, track2Ref.current], {
        xPercent: -100,
        duration: baseDuration,
        ease: 'none',
      });

      // Hover effect - slow down on hover
      const container = containerRef.current;
      if (container) {
        container.addEventListener('mouseenter', () => {
          gsap.to(tl, { timeScale: 0.3, duration: 0.5 });
        });
        container.addEventListener('mouseleave', () => {
          gsap.to(tl, { timeScale: 1, duration: 0.5 });
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [baseDuration]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0E0E0E] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0E0E0E] to-transparent z-10" />

      {/* Marquee track */}
      <div className="flex">
        <div ref={track1Ref} className="flex gap-6 shrink-0 pr-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-zinc-800/50 glass"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
              <span className="text-sm text-zinc-400 whitespace-nowrap font-medium">{item}</span>
            </div>
          ))}
        </div>
        {/* Duplicate for seamless loop */}
        <div ref={track2Ref} className="flex gap-6 shrink-0 pr-6" aria-hidden="true">
          {items.map((item, index) => (
            <div
              key={`dup-${index}`}
              className="flex items-center gap-3 px-5 py-2.5 rounded-full border border-zinc-800/50 glass"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500/60" />
              <span className="text-sm text-zinc-400 whitespace-nowrap font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
