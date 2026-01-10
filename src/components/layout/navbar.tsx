'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserHeader } from '@/components/user/user-header';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/batches', label: 'Batches' },
  { href: '/batches/new', label: 'New' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-900">
      <div className="max-w-4xl mx-auto px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition-colors">
            <span className="text-sm font-light tracking-widest uppercase">Orca</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/batches' && pathname.startsWith('/batches') && pathname !== '/batches/new');

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

          {/* User */}
          <UserHeader />
        </div>
      </div>
    </nav>
  );
}
