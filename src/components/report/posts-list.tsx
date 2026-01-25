'use client';

import { Instagram, Youtube, Music2, Globe, Play, Eye, AlertTriangle, Tag } from 'lucide-react';
import { cn, getProxiedMediaUrl } from '@/lib/utils';
import type { Finding, VisualAnalysisData } from '@/types';
import type { FlagEvidence } from '@/types/video-analysis';

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'web';

interface PostsListProps {
  posts: Finding[];
  selectedPostId?: string;
  onPostSelect?: (finding: Finding) => void;
  className?: string;
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
  web: 'text-zinc-400',
};

/**
 * Get platform from finding
 */
function getPlatformFromFinding(finding: Finding): Platform {
  if (finding.socialMediaSource?.platform) {
    return finding.socialMediaSource.platform as Platform;
  }
  const url = finding.source.url.toLowerCase();
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'web';
}

/**
 * Get flag counts from visual analysis
 */
function getFlagCounts(finding: Finding): { high: number; medium: number; low: number; total: number } {
  const va = finding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
  const evidence = va?.safetyRationale?.evidence as FlagEvidence[] | undefined;

  if (!evidence || evidence.length === 0) {
    // Fallback to severity-based flag if no evidence
    const severity = finding.severity;
    if (severity === 'critical' || severity === 'high') {
      return { high: 1, medium: 0, low: 0, total: 1 };
    }
    if (severity === 'medium') {
      return { high: 0, medium: 1, low: 0, total: 1 };
    }
    return { high: 0, medium: 0, low: 0, total: 0 };
  }

  const high = evidence.filter(e => e.severity === 'high').length;
  const medium = evidence.filter(e => e.severity === 'medium').length;
  const low = evidence.filter(e => e.severity === 'low').length;
  return { high, medium, low, total: high + medium + low };
}

/**
 * Format date to short format
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Single post item in the list
 */
function PostItem({
  finding,
  isSelected,
  onSelect,
}: {
  finding: Finding;
  isSelected: boolean;
  onSelect?: () => void;
}) {
  const platform = getPlatformFromFinding(finding);
  const PlatformIcon = platformIcons[platform];
  const flagCounts = getFlagCounts(finding);
  const hasThumbnail = !!finding.socialMediaSource?.thumbnailUrl;
  const isVideo = finding.socialMediaSource?.mediaType === 'video';
  const hasVisualAnalysis = !!finding.socialMediaSource?.visualAnalysis;
  const brandCount = finding.socialMediaSource?.visualAnalysis?.brands?.length || 0;

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left',
        'hover:bg-zinc-800/50',
        isSelected && 'bg-zinc-800 ring-1 ring-zinc-700'
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
        {hasThumbnail ? (
          <img
            src={getProxiedMediaUrl(finding.socialMediaSource!.thumbnailUrl)}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
            <PlatformIcon className={cn('w-6 h-6', platformColors[platform])} />
          </div>
        )}

        {/* Flag count badge */}
        {flagCounts.total > 0 && (
          <div className={cn(
            'absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded flex items-center justify-center text-[10px] font-bold',
            flagCounts.high > 0
              ? 'bg-red-500 text-white'
              : flagCounts.medium > 0
              ? 'bg-amber-500 text-zinc-900'
              : 'bg-yellow-500 text-zinc-900'
          )}>
            {flagCounts.total}
          </div>
        )}

        {/* Video indicator */}
        {isVideo && (
          <div className="absolute bottom-1 right-1 p-0.5 bg-black/70 rounded">
            <Play className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Platform and date row */}
        <div className="flex items-center gap-2 mb-1">
          <PlatformIcon className={cn('w-3.5 h-3.5', platformColors[platform])} />
          <span className={cn('text-xs capitalize', platformColors[platform])}>
            {platform}
          </span>
          {finding.source.publishedDate && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="text-xs text-zinc-600">
                {formatDate(finding.source.publishedDate)}
              </span>
            </>
          )}
        </div>

        {/* Title/caption preview */}
        <p className="text-sm text-zinc-300 line-clamp-2 mb-1.5">
          {finding.title}
        </p>

        {/* Indicators row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Flag severity indicators */}
          {flagCounts.high > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">
              <AlertTriangle className="w-2.5 h-2.5" />
              {flagCounts.high}
            </span>
          )}
          {flagCounts.medium > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
              <AlertTriangle className="w-2.5 h-2.5" />
              {flagCounts.medium}
            </span>
          )}

          {/* Analysis indicator */}
          {hasVisualAnalysis && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">
              <Eye className="w-2.5 h-2.5" />
            </span>
          )}

          {/* Brand count */}
          {brandCount > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400 rounded">
              <Tag className="w-2.5 h-2.5" />
              {brandCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * PostsList - Vertical scrollable list of social media posts
 * Replaces the 4-column grid with a more scannable list view
 */
export function PostsList({
  posts,
  selectedPostId,
  onPostSelect,
  className,
}: PostsListProps) {
  if (!posts || posts.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <p className="text-sm text-zinc-500">No posts found</p>
      </div>
    );
  }

  // Sort by severity (most severe first), then by date
  const sortedPosts = [...posts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const aSeverity = severityOrder[a.severity] ?? 4;
    const bSeverity = severityOrder[b.severity] ?? 4;
    if (aSeverity !== bSeverity) return aSeverity - bSeverity;

    // Then by flag count
    const aFlags = getFlagCounts(a).total;
    const bFlags = getFlagCounts(b).total;
    return bFlags - aFlags;
  });

  // Create a unique ID for each finding
  const getPostId = (finding: Finding, index: number) => {
    return finding.socialMediaSource?.postId || `post-${index}`;
  };

  return (
    <div className={cn('space-y-1', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs uppercase tracking-wider text-zinc-500">
          Posts ({posts.length})
        </h3>
        {/* Quick stats */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <span>{posts.filter(p => getPlatformFromFinding(p) === 'tiktok').length} TikTok</span>
          <span>{posts.filter(p => getPlatformFromFinding(p) === 'instagram').length} IG</span>
          <span>{posts.filter(p => getPlatformFromFinding(p) === 'youtube').length} YT</span>
        </div>
      </div>

      {/* Posts list */}
      <div className="space-y-0.5">
        {sortedPosts.map((finding, idx) => {
          const postId = getPostId(finding, idx);
          return (
            <PostItem
              key={postId}
              finding={finding}
              isSelected={selectedPostId === postId}
              onSelect={() => onPostSelect?.(finding)}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact version for smaller displays
 */
export function PostsListCompact({
  posts,
  selectedPostId,
  onPostSelect,
  maxItems = 5,
  className,
}: PostsListProps & { maxItems?: number }) {
  const flaggedPosts = posts.filter(p => getFlagCounts(p).total > 0);
  const displayPosts = flaggedPosts.slice(0, maxItems);

  if (displayPosts.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayPosts.map((finding, idx) => {
        const platform = getPlatformFromFinding(finding);
        const PlatformIcon = platformIcons[platform];
        const flagCounts = getFlagCounts(finding);
        const postId = finding.socialMediaSource?.postId || `post-${idx}`;

        return (
          <button
            key={postId}
            onClick={() => onPostSelect?.(finding)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors text-left',
              'hover:bg-zinc-800/50',
              selectedPostId === postId && 'bg-zinc-800'
            )}
          >
            <PlatformIcon className={cn('w-3.5 h-3.5', platformColors[platform])} />
            <span className="flex-1 text-xs text-zinc-400 truncate">
              {finding.title}
            </span>
            {flagCounts.total > 0 && (
              <span className={cn(
                'px-1.5 py-0.5 text-[10px] rounded',
                flagCounts.high > 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
              )}>
                {flagCounts.total}
              </span>
            )}
          </button>
        );
      })}
      {flaggedPosts.length > maxItems && (
        <p className="text-[10px] text-zinc-600 px-2">
          +{flaggedPosts.length - maxItems} more flagged
        </p>
      )}
    </div>
  );
}
