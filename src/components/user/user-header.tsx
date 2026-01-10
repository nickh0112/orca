'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useUserEmail } from '@/hooks/use-user-email';

export function UserHeader() {
  const { email, clearEmail } = useUserEmail();
  const [showMenu, setShowMenu] = useState(false);

  if (!email) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
      >
        {email}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-3 py-2 bg-zinc-900 border border-zinc-800 rounded z-20">
            <button
              onClick={() => {
                clearEmail();
                setShowMenu(false);
                window.location.reload();
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Switch User
            </button>
          </div>
        </>
      )}
    </div>
  );
}
