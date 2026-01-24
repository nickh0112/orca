'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Home,
  Bell,
  BarChart3,
  Layers,
  Calendar,
  Users,
  Settings,
  Plus,
} from 'lucide-react';
import { useState } from 'react';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, isActive, badge }: NavItemProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 group',
        isActive
          ? 'bg-zinc-800/80 text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Active indicator - left border accent */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-500 rounded-r-full" />
      )}

      {/* Icon */}
      <span className={cn(
        'transition-transform duration-200',
        isActive ? 'scale-100' : 'group-hover:scale-110'
      )}>
        {icon}
      </span>

      {/* Notification badge */}
      {badge && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-semibold bg-red-500 text-white rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-800 text-zinc-200 text-xs font-medium rounded-md whitespace-nowrap z-50 shadow-lg shadow-black/20 border border-zinc-700/50">
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-zinc-800 rotate-45 border-l border-b border-zinc-700/50" />
        </div>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const locale = useLocale();

  const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  const navItems = [
    {
      href: `/${locale}`,
      icon: <Home size={18} />,
      label: 'Dashboard',
      match: (path: string) => path === '/',
    },
    {
      href: `/${locale}/notifications`,
      icon: <Bell size={18} />,
      label: 'Notifications',
      match: (path: string) => path === '/notifications',
      badge: 3,
    },
    {
      href: `/${locale}/analytics`,
      icon: <BarChart3 size={18} />,
      label: 'Analytics',
      match: (path: string) => path === '/analytics',
    },
    {
      href: `/${locale}/batches`,
      icon: <Layers size={18} />,
      label: 'Batches',
      match: (path: string) => path.startsWith('/batches') && path !== '/batches/new',
    },
    {
      href: `/${locale}/calendar`,
      icon: <Calendar size={18} />,
      label: 'Calendar',
      match: (path: string) => path === '/calendar',
    },
    {
      href: `/${locale}/team`,
      icon: <Users size={18} />,
      label: 'Team',
      match: (path: string) => path === '/team',
    },
  ];

  return (
    <aside className="flex flex-col w-[60px] h-screen bg-zinc-950 border-r border-zinc-800/60">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 border-b border-zinc-800/60">
        <Link href={`/${locale}`} className="group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20 transition-transform duration-200 group-hover:scale-105">
            <span className="text-sm font-bold text-white tracking-tight">O</span>
          </div>
        </Link>
      </div>

      {/* New batch button */}
      <div className="flex items-center justify-center py-4">
        <Link
          href={`/${locale}/batches/new`}
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200',
            'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200',
            'border border-zinc-700/50 hover:border-zinc-600',
            pathnameWithoutLocale === '/batches/new' && 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
          )}
        >
          <Plus size={18} />
        </Link>
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-zinc-800/60" />

      {/* Main navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1.5 py-4 px-2.5">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={item.match(pathnameWithoutLocale)}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Bottom section - Settings */}
      <div className="flex flex-col items-center gap-2 py-4 px-2.5 border-t border-zinc-800/60">
        <NavItem
          href={`/${locale}/settings`}
          icon={<Settings size={18} />}
          label="Settings"
          isActive={pathnameWithoutLocale === '/settings'}
        />
      </div>
    </aside>
  );
}
