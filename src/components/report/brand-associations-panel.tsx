'use client';

import { useMemo, useState } from 'react';
import { Tag, Clock, Star, AlertTriangle, ArrowUpRight, ChevronDown, ChevronUp, Filter, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandPartnership {
  brandName: string;
  platform: string;
  postCount: number;
  isCompetitor?: boolean;
}

interface LogoDetection {
  brand: string;
  appearances: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    prominence?: 'primary' | 'secondary' | 'background';
  }>;
  totalDuration: number;
  likelySponsor: boolean;
  videoCount?: number;
}

interface BrandAssociationsPanelProps {
  brandPartnerships: BrandPartnership[];
  logoDetections: LogoDetection[];
  competitorBrandNames: string[];
  onBrandClick?: (brand: string, time?: number) => void;
  className?: string;
}

type FilterMode = 'all' | 'sponsors' | 'competitors' | 'incidental';
type SortMode = 'relevance' | 'screenTime' | 'mentions' | 'alphabetical';

interface MergedBrand {
  name: string;
  // From partnerships
  partnership?: BrandPartnership;
  // From logo detections
  logoDetection?: LogoDetection;
  // Computed
  isCompetitor: boolean;
  isSponsor: boolean;
  totalScreenTime: number;
  totalMentions: number;
  videoCount: number;
  relevanceScore: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BrandAssociationsPanel({
  brandPartnerships,
  logoDetections,
  competitorBrandNames,
  onBrandClick,
  className,
}: BrandAssociationsPanelProps) {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('relevance');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Merge brand partnerships and logo detections
  const mergedBrands = useMemo(() => {
    const brandMap = new Map<string, MergedBrand>();

    // Add partnerships
    for (const partnership of brandPartnerships) {
      const key = partnership.brandName.toLowerCase();
      const isCompetitor = competitorBrandNames.some(
        c => c.toLowerCase() === key
      );

      brandMap.set(key, {
        name: partnership.brandName,
        partnership,
        isCompetitor: partnership.isCompetitor || isCompetitor,
        isSponsor: false,
        totalScreenTime: 0,
        totalMentions: partnership.postCount,
        videoCount: 0,
        relevanceScore: partnership.postCount * 10 + (isCompetitor ? 100 : 0),
      });
    }

    // Add/merge logo detections
    for (const logo of logoDetections) {
      const key = logo.brand.toLowerCase();
      const existing = brandMap.get(key);
      const isCompetitor = competitorBrandNames.some(
        c => c.toLowerCase() === key
      );

      if (existing) {
        existing.logoDetection = logo;
        existing.isSponsor = existing.isSponsor || logo.likelySponsor;
        existing.totalScreenTime = logo.totalDuration;
        existing.videoCount = logo.videoCount || 1;
        existing.relevanceScore += logo.totalDuration * 5 + (logo.likelySponsor ? 50 : 0);
        existing.isCompetitor = existing.isCompetitor || isCompetitor;
      } else {
        brandMap.set(key, {
          name: logo.brand,
          logoDetection: logo,
          isCompetitor,
          isSponsor: logo.likelySponsor,
          totalScreenTime: logo.totalDuration,
          totalMentions: 0,
          videoCount: logo.videoCount || 1,
          relevanceScore: logo.totalDuration * 5 + (logo.likelySponsor ? 50 : 0) + (isCompetitor ? 100 : 0),
        });
      }
    }

    return Array.from(brandMap.values());
  }, [brandPartnerships, logoDetections, competitorBrandNames]);

  // Filter brands
  const filteredBrands = useMemo(() => {
    let result = mergedBrands;

    switch (filter) {
      case 'sponsors':
        result = result.filter(b => b.isSponsor);
        break;
      case 'competitors':
        result = result.filter(b => b.isCompetitor);
        break;
      case 'incidental':
        result = result.filter(b => !b.isSponsor && !b.isCompetitor);
        break;
    }

    return result;
  }, [mergedBrands, filter]);

  // Sort brands
  const sortedBrands = useMemo(() => {
    const sorted = [...filteredBrands];

    switch (sort) {
      case 'relevance':
        sorted.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'screenTime':
        sorted.sort((a, b) => b.totalScreenTime - a.totalScreenTime);
        break;
      case 'mentions':
        sorted.sort((a, b) => b.totalMentions - a.totalMentions);
        break;
      case 'alphabetical':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return sorted;
  }, [filteredBrands, sort]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: mergedBrands.length,
      sponsors: mergedBrands.filter(b => b.isSponsor).length,
      competitors: mergedBrands.filter(b => b.isCompetitor).length,
      totalScreenTime: mergedBrands.reduce((sum, b) => sum + b.totalScreenTime, 0),
    };
  }, [mergedBrands]);

  if (mergedBrands.length === 0) {
    return (
      <div className={cn('max-w-4xl mx-auto', className)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Tag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-zinc-200 text-lg font-light">Brand Associations</h2>
            <p className="text-zinc-500 text-sm">No brand data available for this creator</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Tag className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-zinc-200 text-lg font-light">Brand Associations</h2>
            <p className="text-zinc-500 text-sm">
              {stats.total} brands detected across partnerships and video content
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-2xl text-zinc-200 font-light">{stats.total}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Total Brands</div>
        </div>
        <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-900/50">
          <div className="text-2xl text-purple-400 font-light">{stats.sponsors}</div>
          <div className="text-xs text-purple-400/60 uppercase tracking-wider">Sponsors</div>
        </div>
        <div className="p-3 bg-red-950/30 rounded-lg border border-red-900/50">
          <div className="text-2xl text-red-400 font-light">{stats.competitors}</div>
          <div className="text-xs text-red-400/60 uppercase tracking-wider">Competitors</div>
        </div>
        <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <div className="text-2xl text-zinc-200 font-light">{formatDuration(stats.totalScreenTime)}</div>
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Screen Time</div>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              filter === 'all'
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('sponsors')}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              filter === 'sponsors'
                ? 'bg-purple-900/50 text-purple-300'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            Sponsors ({stats.sponsors})
          </button>
          <button
            onClick={() => setFilter('competitors')}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              filter === 'competitors'
                ? 'bg-red-900/50 text-red-300'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            Competitors ({stats.competitors})
          </button>
          <button
            onClick={() => setFilter('incidental')}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md transition-colors',
              filter === 'incidental'
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-400'
            )}
          >
            Incidental
          </button>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-xs text-zinc-400 focus:outline-none focus:border-zinc-700"
          >
            <option value="relevance">Sort by Relevance</option>
            <option value="screenTime">Sort by Screen Time</option>
            <option value="mentions">Sort by Mentions</option>
            <option value="alphabetical">Sort Alphabetically</option>
          </select>
        </div>
      </div>

      {/* Brand List */}
      <div className="space-y-2">
        {sortedBrands.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-sm">
            No brands match the current filter
          </div>
        ) : (
          sortedBrands.map((brand) => {
            const isExpanded = expanded === brand.name;

            return (
              <div
                key={brand.name}
                className={cn(
                  'rounded-lg border transition-colors',
                  brand.isCompetitor
                    ? 'bg-red-950/20 border-red-900/40'
                    : brand.isSponsor
                    ? 'bg-purple-950/30 border-purple-900/50'
                    : 'bg-zinc-900/50 border-zinc-800'
                )}
              >
                {/* Brand Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : brand.name)}
                  className="w-full px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-200 font-medium">{brand.name}</span>
                    <div className="flex items-center gap-1.5">
                      {brand.isCompetitor && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded border border-red-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          COMPETITOR
                        </span>
                      )}
                      {brand.isSponsor && (
                        <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5" />
                          SPONSOR
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {brand.totalScreenTime > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Clock className="w-3 h-3" />
                        {formatDuration(brand.totalScreenTime)}
                      </div>
                    )}
                    {brand.videoCount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Video className="w-3 h-3" />
                        {brand.videoCount} {brand.videoCount === 1 ? 'video' : 'videos'}
                      </div>
                    )}
                    {brand.totalMentions > 0 && (
                      <div className="text-xs text-zinc-500">
                        {brand.totalMentions} posts
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50 space-y-4">
                    {/* Partnership Info */}
                    {brand.partnership && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                          Partnership History
                        </p>
                        <div className="p-3 bg-zinc-900/50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-300">
                              {brand.partnership.postCount} branded posts
                            </span>
                            <span className="text-xs text-zinc-500 capitalize">
                              via {brand.partnership.platform}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Video Appearances */}
                    {brand.logoDetection && brand.logoDetection.appearances.length > 0 && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                          Video Appearances
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {brand.logoDetection.appearances.slice(0, 10).map((app, i) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                e.stopPropagation();
                                onBrandClick?.(brand.name, app.startTime);
                              }}
                              className={cn(
                                'px-2 py-1.5 text-xs rounded border transition-colors flex items-center gap-1.5',
                                'hover:bg-zinc-700',
                                app.prominence === 'primary'
                                  ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
                                  : app.prominence === 'secondary'
                                  ? 'bg-amber-950/50 border-amber-800/50 text-amber-400'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                              )}
                            >
                              <span>{formatTime(app.startTime)} - {formatTime(app.endTime)}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-50" />
                            </button>
                          ))}
                          {brand.logoDetection.appearances.length > 10 && (
                            <span className="px-2 py-1.5 text-xs text-zinc-500">
                              +{brand.logoDetection.appearances.length - 10} more
                            </span>
                          )}
                        </div>
                        {/* Prominence Legend */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-[10px] text-zinc-500">Primary</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-[10px] text-zinc-500">Secondary</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-zinc-600" />
                            <span className="text-[10px] text-zinc-500">Background</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* View in Content Button */}
                    {brand.logoDetection && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBrandClick?.(brand.name, brand.logoDetection?.appearances[0]?.startTime);
                        }}
                        className="w-full px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors flex items-center justify-center gap-2"
                      >
                        View in Content
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
