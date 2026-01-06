'use client';

import { useState } from 'react';
import { User, ChevronDown, LogOut } from 'lucide-react';
import { useUserEmail } from '@/hooks/use-user-email';

export function UserHeader() {
  const { email, clearEmail } = useUserEmail();
  const [showMenu, setShowMenu] = useState(false);

  if (!email) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
      >
        <User className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">{email}</span>
        <ChevronDown className="w-4 h-4 text-zinc-500" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20">
            <button
              onClick={() => {
                clearEmail();
                setShowMenu(false);
                window.location.reload();
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Switch User
            </button>
          </div>
        </>
      )}
    </div>
  );
}
