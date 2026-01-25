'use client';

import { Instagram, Youtube, Music2, Check, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlatformProgress as PlatformProgressType } from '@/hooks/use-research-feed';

interface PlatformProgressProps {
  platforms: Map<string, PlatformProgressType>;
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'instagram':
      return Instagram;
    case 'youtube':
      return Youtube;
    case 'tiktok':
      return Music2;
    default:
      return Music2;
  }
}

function getPlatformColor(platform: string): string {
  switch (platform) {
    case 'instagram':
      return 'text-pink-400';
    case 'youtube':
      return 'text-red-400';
    case 'tiktok':
      return 'text-cyan-400';
    default:
      return 'text-zinc-400';
  }
}

function getPlatformBg(platform: string): string {
  switch (platform) {
    case 'instagram':
      return 'bg-pink-500/10';
    case 'youtube':
      return 'bg-red-500/10';
    case 'tiktok':
      return 'bg-cyan-500/10';
    default:
      return 'bg-zinc-800';
  }
}

export function PlatformProgress({ platforms }: PlatformProgressProps) {
  const platformEntries = Array.from(platforms.entries());

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider">
        <span>Platforms</span>
      </div>

      <div className="flex gap-3">
        {platformEntries.map(([platform, progress]) => {
          const Icon = getPlatformIcon(platform);
          const isFetching = progress.status === 'fetching';
          const isCompleted = progress.status === 'completed';
          const isFailed = progress.status === 'failed';

          return (
            <div
              key={platform}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                isFetching
                  ? cn(getPlatformBg(platform), 'animate-pulse')
                  : isCompleted
                  ? 'bg-zinc-800/30'
                  : isFailed
                  ? 'bg-red-950/30'
                  : 'bg-zinc-800/20'
              )}
            >
              <Icon className={cn('w-4 h-4', getPlatformColor(platform))} />

              <span className="text-sm text-zinc-400 capitalize">{platform}</span>

              {/* Status indicator */}
              <div className="ml-1">
                {isFetching && (
                  <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
                )}
                {isCompleted && (
                  <div className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    {progress.postsCount !== undefined && progress.postsCount > 0 && (
                      <span className="text-xs text-zinc-500">
                        {progress.postsCount}
                      </span>
                    )}
                  </div>
                )}
                {isFailed && <X className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
