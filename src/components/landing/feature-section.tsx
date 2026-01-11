'use client';

import { ReactNode, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cn } from '@/lib/utils';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  index: number;
}

function FeatureCard({ title, description, icon, index }: FeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 40,
        duration: 0.6,
        delay: index * 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: cardRef.current,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    });

    return () => ctx.revert();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className="group p-6 rounded-2xl border border-zinc-800/50 glass shimmer-border hover:border-zinc-700/50 transition-all duration-300 hover:translate-y-[-2px]"
    >
      {icon && (
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-zinc-800/50 text-zinc-300 mb-4 group-hover:text-purple-400 transition-colors icon-glow">
          {icon}
        </div>
      )}
      <h4 className="text-lg font-medium text-white mb-2">{title}</h4>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

interface FeatureSectionProps {
  id: string;
  number: string;
  label: string;
  title: string;
  description: string;
  features: Array<{ title: string; description: string; icon?: ReactNode }>;
  reversed?: boolean;
  image?: string;
}

export function FeatureSection({
  id,
  number,
  label,
  title,
  description,
  features,
  reversed = false,
  image,
}: FeatureSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate header on scroll
      gsap.from(headerRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          toggleActions: 'play none none reverse',
        },
      });

      // Animate image on scroll
      if (imageRef.current) {
        gsap.from(imageRef.current, {
          opacity: 0,
          x: reversed ? -50 : 50,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: imageRef.current,
            start: 'top 80%',
            toggleActions: 'play none none reverse',
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reversed]);

  return (
    <section ref={sectionRef} id={id} className="relative py-24 lg:py-32">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            top: '20%',
            left: reversed ? '60%' : '-10%',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section header with optional image */}
        <div
          ref={headerRef}
          className={cn(
            'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-16',
          )}
        >
          <div className={cn(reversed && 'lg:order-2')}>
            {/* Number badge */}
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="text-xs text-purple-400/80 font-mono tracking-widest">{number}</span>
              <span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">{label}</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.15] mb-6">
              {title}
            </h2>

            {/* Description */}
            <p className="text-lg text-zinc-400 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Image */}
          <div
            ref={imageRef}
            className={cn(
              'relative',
              reversed && 'lg:order-1'
            )}
          >
            {image ? (
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800/50">
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-transparent to-transparent z-10 pointer-events-none" />
                <div className={cn(
                  "absolute inset-0 z-10 pointer-events-none",
                  reversed
                    ? "bg-gradient-to-r from-[#0E0E0E] via-transparent to-transparent"
                    : "bg-gradient-to-l from-[#0E0E0E] via-transparent to-transparent"
                )} />
                <Image
                  src={image}
                  alt={label}
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            ) : (
              // Placeholder when no image
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-800/30 bg-zinc-900/30">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
                      <span className="text-2xl text-purple-400/60 font-mono">{number}</span>
                    </div>
                    <p className="text-zinc-600 text-sm">Image: {label.toLowerCase()}.webp</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
