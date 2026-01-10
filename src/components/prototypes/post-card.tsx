'use client';

import { cn } from '@/lib/utils';
import { ExternalLink, Heart, MessageCircle, Eye, Share2, Instagram, Youtube, Music2, Globe } from 'lucide-react';
import { HighlightedText } from './highlighted-text';
import { SeverityBadge } from './severity-badge';
import { formatEngagement } from '@/lib/dummy-report-data';
import type { Finding, Platform, Engagement } from '@/lib/dummy-report-data';

interface PostCardProps {
  finding: Finding;
  variant?: 'compact' | 'expanded' | 'full';
  showEngagement?: boolean;
  showSource?: boolean;
  className?: string;
  onClick?: () => void;
}

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

const platformColors: Record<Platform, string> = {
  instagram: 'text-pink-400',
  youtube: 'text-red-400',
  tiktok: 'text-cyan-400',
  web: 'text-blue-400',
};

export function PostCard({
  finding,
  variant = 'expanded',
  showEngagement = true,
  showSource = true,
  className,
  onClick,
}: PostCardProps) {
  const PlatformIcon = platformIcons[finding.platform];
  const hasPostContent = finding.postContent?.caption || finding.postContent?.transcript;

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 hover:border-zinc-600 transition-colors cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5', platformColors[finding.platform])}>
            <PlatformIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <SeverityBadge severity={finding.severity} size="sm" showLabel={false} />
              <span className="text-sm font-medium text-zinc-200 truncate">{finding.title}</span>
            </div>
            <p className="text-xs text-zinc-500 line-clamp-1">{finding.summary}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden',
        onClick && 'cursor-pointer hover:border-zinc-600 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-1.5 rounded-lg bg-zinc-700/50', platformColors[finding.platform])}>
            <PlatformIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">{finding.title}</span>
              <SeverityBadge severity={finding.severity} size="sm" />
            </div>
            <span className="text-xs text-zinc-500">{finding.source.date}</span>
          </div>
        </div>
        {finding.isUncertain && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Uncertain
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Summary */}
        <p className="text-sm text-zinc-400">{finding.summary}</p>

        {/* Post Content (if available) */}
        {hasPostContent && (
          <div className="space-y-3 pt-2">
            {finding.postContent?.caption && (
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Caption</div>
                <div className="text-sm text-zinc-300">
                  <HighlightedText
                    text={finding.postContent.caption}
                    highlights={finding.postContent.flaggedSpans}
                  />
                </div>
              </div>
            )}
            {finding.postContent?.transcript && variant === 'full' && (
              <div className="bg-zinc-900/50 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Transcript</div>
                <div className="text-sm text-zinc-300">
                  <HighlightedText
                    text={finding.postContent.transcript}
                    highlights={finding.postContent.flaggedSpans}
                    showReasons={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uncertainty note */}
        {finding.isUncertain && finding.uncertainReason && (
          <div className="text-xs text-yellow-400/80 bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
            Note: {finding.uncertainReason}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-700/50 flex items-center justify-between">
        {/* Engagement */}
        {showEngagement && finding.engagement && (
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {finding.engagement.likes && (
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {formatEngagement(finding.engagement.likes)}
              </span>
            )}
            {finding.engagement.comments && (
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {formatEngagement(finding.engagement.comments)}
              </span>
            )}
            {finding.engagement.views && (
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {formatEngagement(finding.engagement.views)}
              </span>
            )}
            {finding.engagement.shares && (
              <span className="flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5" />
                {formatEngagement(finding.engagement.shares)}
              </span>
            )}
          </div>
        )}
        {!showEngagement && !finding.engagement && <div />}

        {/* Source link */}
        {showSource && (
          <a
            href={finding.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{finding.source.title}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// Engagement stats display
export function EngagementStats({ engagement }: { engagement: Engagement }) {
  return (
    <div className="flex items-center gap-4 text-sm text-zinc-400">
      {engagement.likes && (
        <span className="flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-red-400" />
          {formatEngagement(engagement.likes)}
        </span>
      )}
      {engagement.comments && (
        <span className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          {formatEngagement(engagement.comments)}
        </span>
      )}
      {engagement.views && (
        <span className="flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-purple-400" />
          {formatEngagement(engagement.views)}
        </span>
      )}
      {engagement.shares && (
        <span className="flex items-center gap-1.5">
          <Share2 className="w-4 h-4 text-green-400" />
          {formatEngagement(engagement.shares)}
        </span>
      )}
    </div>
  );
}
