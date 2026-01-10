'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { UserHeader } from '@/components/user/user-header';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const locale = useLocale();

  const navItems = [
    { href: `/${locale}`, label: t('dashboard') },
    { href: `/${locale}/batches`, label: t('batches') },
    { href: `/${locale}/batches/new`, label: t('new') },
  ];

  // Remove locale prefix from pathname for comparison
  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900">
      <div className="max-w-4xl mx-auto px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={`/${locale}`} className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <span className="text-sm font-light tracking-widest uppercase">Orca</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const itemPath = item.href.replace(`/${locale}`, '') || '/';
              const isActive = pathnameWithoutLocale === itemPath ||
                (itemPath === '/batches' && pathnameWithoutLocale.startsWith('/batches') && pathnameWithoutLocale !== '/batches/new');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm transition-colors',
                    isActive
                      ? 'text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Language & User */}
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <UserHeader />
          </div>
        </div>
      </div>
    </nav>
  );
}
