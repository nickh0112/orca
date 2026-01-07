'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LayoutDashboard, FolderOpen, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserHeader } from '@/components/user/user-header';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/batches', label: 'Batches', icon: FolderOpen },
  { href: '/batches/new', label: 'New Batch', icon: Plus },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-zinc-400" />
            <span className="text-lg font-semibold text-zinc-50">Orca</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href === '/batches' && pathname.startsWith('/batches') && pathname !== '/batches/new');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
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
