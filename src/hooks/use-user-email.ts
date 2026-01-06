'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'orca_user_email';

export function useUserEmail() {
  const [email, setEmailState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setEmailState(stored);
    setIsLoading(false);
  }, []);

  const setEmail = useCallback((newEmail: string) => {
    localStorage.setItem(STORAGE_KEY, newEmail);
    setEmailState(newEmail);
  }, []);

  const clearEmail = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEmailState(null);
  }, []);

  return {
    email,
    setEmail,
    clearEmail,
    isLoading,
    hasEmail: !!email,
  };
}
