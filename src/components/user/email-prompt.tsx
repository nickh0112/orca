'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface EmailPromptProps {
  onSubmit: (email: string) => void;
}

export function EmailPrompt({ onSubmit }: EmailPromptProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    onSubmit(email.trim().toLowerCase());
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Mail className="w-5 h-5 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Welcome to Orca
          </h2>
        </div>

        <p className="text-sm text-zinc-400 mb-6">
          Enter your email to get started. This helps organize reports by team member.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="you@company.com"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent"
            autoFocus
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="mt-4 w-full py-3 bg-zinc-100 text-zinc-900 rounded-lg font-medium hover:bg-zinc-200 transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
