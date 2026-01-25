'use client';

import { Search, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchProgress } from '@/hooks/use-research-feed';

interface SearchActivityProps {
  searches: SearchProgress[];
}

function getSourceIcon(source: string): string {
  switch (source) {
    case 'exa':
      return 'E';
    case 'google':
      return 'G';
    default:
      return '?';
  }
}

function getSourceColor(source: string): string {
  switch (source) {
    case 'exa':
      return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    case 'google':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-zinc-700 text-zinc-400 border-zinc-600';
  }
}

export function SearchActivity({ searches }: SearchActivityProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider">
        <Search className="w-3 h-3" />
        <span>Searches</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((search) => (
          <div
            key={search.id}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all',
              search.status === 'searching'
                ? 'bg-zinc-800/50 border-zinc-700 animate-pulse'
                : 'bg-zinc-800/30 border-zinc-800'
            )}
          >
            {/* Source badge */}
            <span
              className={cn(
                'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold border',
                getSourceColor(search.source)
              )}
            >
              {getSourceIcon(search.source)}
            </span>

            {/* Query */}
            <span className="text-sm text-zinc-400 max-w-[200px] truncate">
              {search.query}
            </span>

            {/* Status */}
            {search.status === 'searching' ? (
              <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            ) : (
              <div className="flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                {search.resultsCount !== undefined && (
                  <span className="text-xs text-zinc-500">
                    {search.resultsCount}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
