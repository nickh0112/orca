'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { AnimatedGradient } from './animated-gradient';

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Initial states
      gsap.set([tagRef.current, headlineRef.current, subheadlineRef.current, ctaRef.current], {
        opacity: 0,
        y: 30,
      });

      // Staggered reveal animation
      const tl = gsap.timeline({ delay: 0.2 });

      tl.to(tagRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
      .to(headlineRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5')
      .to(subheadlineRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5')
      .to(ctaRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.5');
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0E0E0E]" />

      {/* Animated gradient orbs */}
      <AnimatedGradient />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-purple-500/50 rounded-full animate-float" />
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-blue-500/40 rounded-full animate-float-delayed" />
        <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-emerald-500/40 rounded-full animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-white/30 rounded-full animate-float-delayed" />
        <div className="absolute bottom-1/4 right-1/2 w-1 h-1 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Tag */}
        <div ref={tagRef} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-800 glass mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
          <span className="text-sm text-zinc-400 tracking-wide">AI-Powered Brand Safety</span>
        </div>

        {/* Main headline */}
        <h1
          ref={headlineRef}
          className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight leading-[1.1] mb-6"
        >
          <span className="text-glow-subtle">The Creator Vetting</span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400">
            Intelligence Stack
          </span>
        </h1>

        {/* Subheadline */}
        <p
          ref={subheadlineRef}
          className="max-w-2xl mx-auto text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10"
        >
          Automate creator due diligence with AI. Analyze content, detect risks,
          and protect your brand at scale.
        </p>

        {/* CTA Buttons */}
        <div ref={ctaRef} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/en"
            className="group relative px-8 py-3.5 bg-white text-black font-medium rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10">Get started</span>
          </a>
          <button
            onClick={() => {
              const element = document.querySelector('#vetting');
              if (element) element.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-3.5 border border-zinc-700 text-zinc-300 font-medium rounded-full hover:border-zinc-500 hover:text-white transition-all shimmer-border"
          >
            Learn more
          </button>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0E0E0E] to-transparent" />
    </section>
  );
}
