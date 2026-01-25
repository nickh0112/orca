'use client';

import { useMemo, useState } from 'react';
import { Tag, Clock, Star, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { LogoDetection } from '@/types';

interface BrandExposurePanelProps {
  logoDetections?: LogoDetection[];
  videoDuration?: number;
  className?: string;
  onBrandClick?: (brand: string, startTime: number) => void;
}

interface ProcessedBrand {
  brand: string;
  totalDuration: number;
  appearances: LogoDetection['appearances'];
  prominenceBreakdown: {
    primary: number;
    secondary: number;
    background: number;
  };
  likelySponsor: boolean;
  avgConfidence: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function BrandExposurePanel({
  logoDetections,
  videoDuration = 60,
  className,
  onBrandClick
}: BrandExposurePanelProps) {
  const t = useTranslations('creatorReport.brandExposure');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'sponsors' | 'incidental'>('all');

  // Process logo detections into aggregated brand data
  const processedBrands = useMemo(() => {
    if (!logoDetections || logoDetections.length === 0) return [];

    return logoDetections
      .map((detection): ProcessedBrand => {
        const prominenceBreakdown = { primary: 0, secondary: 0, background: 0 };
        let totalConfidence = 0;

        detection.appearances.forEach(app => {
          const duration = app.endTime - app.startTime;
          if (app.prominence === 'primary') prominenceBreakdown.primary += duration;
          else if (app.prominence === 'secondary') prominenceBreakdown.secondary += duration;
          else prominenceBreakdown.background += duration;
          totalConfidence += app.confidence;
        });

        return {
          brand: detection.brand,
          totalDuration: detection.totalDuration,
          appearances: detection.appearances,
          prominenceBreakdown,
          likelySponsor: detection.likelySponsor,
          avgConfidence: totalConfidence / detection.appearances.length,
        };
      })
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }, [logoDetections]);

  // Filter brands by view mode
  const filteredBrands = useMemo(() => {
    if (viewMode === 'sponsors') return processedBrands.filter(b => b.likelySponsor);
    if (viewMode === 'incidental') return processedBrands.filter(b => !b.likelySponsor);
    return processedBrands;
  }, [processedBrands, viewMode]);

  // Calculate total brand exposure
  const totalExposure = useMemo(() => {
    return processedBrands.reduce((sum, b) => sum + b.totalDuration, 0);
  }, [processedBrands]);

  const sponsorCount = processedBrands.filter(b => b.likelySponsor).length;
  const incidentalCount = processedBrands.filter(b => !b.likelySponsor).length;

  if (!logoDetections || logoDetections.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/10 rounded-md">
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
        </div>
        <p className="text-zinc-600 text-sm">{t('noData')}</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/10 rounded-md">
            <Tag className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span className="text-zinc-500">
            {t('totalExposure')}: <span className="text-zinc-300">{formatDuration(totalExposure)}</span>
          </span>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg">
        <button
          onClick={() => setViewMode('all')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors',
            viewMode === 'all'
              ? 'bg-zinc-800 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-400'
          )}
        >
          All ({processedBrands.length})
        </button>
        <button
          onClick={() => setViewMode('sponsors')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors',
            viewMode === 'sponsors'
              ? 'bg-purple-900/50 text-purple-300'
              : 'text-zinc-500 hover:text-zinc-400'
          )}
        >
          {t('likelySponsors')} ({sponsorCount})
        </button>
        <button
          onClick={() => setViewMode('incidental')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs rounded-md transition-colors',
            viewMode === 'incidental'
              ? 'bg-zinc-800 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-400'
          )}
        >
          {t('incidentalBrands')} ({incidentalCount})
        </button>
      </div>

      {/* Brand List */}
      <div className="space-y-2">
        {filteredBrands.map((brand) => {
          const isExpanded = expanded === brand.brand;
          const exposurePercent = (brand.totalDuration / videoDuration) * 100;
          const primaryPercent = (brand.prominenceBreakdown.primary / brand.totalDuration) * 100;
          const secondaryPercent = (brand.prominenceBreakdown.secondary / brand.totalDuration) * 100;

          return (
            <div
              key={brand.brand}
              className={cn(
                'rounded-lg border transition-colors',
                brand.likelySponsor
                  ? 'bg-purple-950/30 border-purple-900/50'
                  : 'bg-zinc-900/50 border-zinc-800'
              )}
            >
              {/* Brand Header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : brand.brand)}
                className="w-full px-3 py-2.5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 text-sm font-medium">{brand.brand}</span>
                  {brand.likelySponsor && (
                    <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded border border-purple-500/30 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5" />
                      {t('sponsorBadge')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 text-xs">
                    {formatDuration(brand.totalDuration)}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
              </button>

              {/* Screen Time Bar */}
              <div className="px-3 pb-2">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      brand.likelySponsor ? 'bg-purple-500' : 'bg-zinc-500'
                    )}
                    style={{ width: `${Math.min(exposurePercent, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-zinc-600">
                    {exposurePercent.toFixed(1)}% of video
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {t('appearanceCount', { count: brand.appearances.length })}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-zinc-800/50 space-y-3">
                  {/* Prominence Breakdown */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                      {t('prominence')}
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Stacked bar */}
                      <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden flex">
                        {brand.prominenceBreakdown.primary > 0 && (
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${primaryPercent}%` }}
                            title={`Primary: ${primaryPercent.toFixed(0)}%`}
                          />
                        )}
                        {brand.prominenceBreakdown.secondary > 0 && (
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${secondaryPercent}%` }}
                            title={`Secondary: ${secondaryPercent.toFixed(0)}%`}
                          />
                        )}
                        {brand.prominenceBreakdown.background > 0 && (
                          <div
                            className="h-full bg-zinc-600"
                            style={{ width: `${100 - primaryPercent - secondaryPercent}%` }}
                            title={`Background: ${(100 - primaryPercent - secondaryPercent).toFixed(0)}%`}
                          />
                        )}
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {brand.prominenceBreakdown.primary > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-zinc-500">{t('primary')}</span>
                        </div>
                      )}
                      {brand.prominenceBreakdown.secondary > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="text-[10px] text-zinc-500">{t('secondary')}</span>
                        </div>
                      )}
                      {brand.prominenceBreakdown.background > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-zinc-600" />
                          <span className="text-[10px] text-zinc-500">{t('background')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Appearance Timeline */}
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">
                      Appearances
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {brand.appearances.slice(0, 8).map((app, i) => (
                        <button
                          key={i}
                          onClick={() => onBrandClick?.(brand.brand, app.startTime)}
                          className={cn(
                            'px-2 py-1 text-[10px] rounded border transition-colors',
                            'hover:bg-zinc-700',
                            app.prominence === 'primary'
                              ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-400'
                              : app.prominence === 'secondary'
                              ? 'bg-amber-950/50 border-amber-800/50 text-amber-400'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          )}
                        >
                          {formatTime(app.startTime)} - {formatTime(app.endTime)}
                        </button>
                      ))}
                      {brand.appearances.length > 8 && (
                        <span className="px-2 py-1 text-[10px] text-zinc-500">
                          +{brand.appearances.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Compact summary version for the summary panel
export function BrandExposureSummary({
  logoDetections,
  className
}: {
  logoDetections?: LogoDetection[];
  className?: string;
}) {
  const t = useTranslations('creatorReport.brandExposure');

  if (!logoDetections || logoDetections.length === 0) return null;

  const sponsors = logoDetections.filter(l => l.likelySponsor);
  const totalExposure = logoDetections.reduce((sum, l) => sum + l.totalDuration, 0);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-xs">{t('title')}</span>
        <span className="text-zinc-400 text-xs">{logoDetections.length} brands</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-purple-400">
          {sponsors.length} {t('likelySponsors').toLowerCase()}
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-400">
          {formatDuration(totalExposure)} total
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {logoDetections.slice(0, 5).map((logo, i) => (
          <span
            key={i}
            className={cn(
              'px-1.5 py-0.5 text-[10px] rounded',
              logo.likelySponsor
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-zinc-800 text-zinc-400'
            )}
          >
            {logo.brand}
          </span>
        ))}
        {logoDetections.length > 5 && (
          <span className="text-[10px] text-zinc-600">
            +{logoDetections.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}
