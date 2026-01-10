'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    // Replace the current locale in the path with the new one
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => switchLocale('en')}
        className={locale === 'en' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400 transition-colors'}
      >
        EN
      </button>
      <span className="text-zinc-700">|</span>
      <button
        onClick={() => switchLocale('de')}
        className={locale === 'de' ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400 transition-colors'}
      >
        DE
      </button>
    </div>
  );
}
