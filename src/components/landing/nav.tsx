'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const sections = [
  { number: '01', label: 'VETTING', href: '#vetting' },
  { number: '02', label: 'ANALYTICS', href: '#analytics' },
  { number: '03', label: 'REPORTS', href: '#reports' },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-[#0E0E0E]/90 backdrop-blur-md' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/landing" className="flex items-center gap-2">
            <span className="text-xl font-medium text-white tracking-tight">orca</span>
          </a>

          {/* Center Navigation - Numbered Sections */}
          <div className="hidden md:flex items-center gap-8">
            {sections.map((section) => (
              <button
                key={section.number}
                onClick={() => scrollToSection(section.href)}
                className="group flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                  {section.number}
                </span>
                <span className="tracking-wide">{section.label}</span>
              </button>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">
            <a
              href="/en"
              className="hidden sm:block text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Login
            </a>
            <a
              href="/en"
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-full hover:bg-zinc-200 transition-colors"
            >
              Get started
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
