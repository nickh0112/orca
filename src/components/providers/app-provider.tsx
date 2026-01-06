'use client';

import { useUserEmail } from '@/hooks/use-user-email';
import { EmailPrompt } from '@/components/user/email-prompt';

interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { email, setEmail, isLoading } = useUserEmail();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <EmailPrompt onSubmit={setEmail} />
      </div>
    );
  }

  return <>{children}</>;
}
