'use client';

import { AlertTriangle, X, ChevronDown, ChevronUp, Clock, Tag } from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { LogoDetection } from '@/types';

interface CompetitorAlertProps {
  logoDetections?: LogoDetection[];
  competitorBrands?: string[];
  className?: string;
  onDismiss?: () => void;
  onBrandClick?: (brand: string, startTime: number) => void;
}

interface CompetitorBrand {
  brand: string;
  totalDuration: number;
  appearances: number;
  likelySponsor: boolean;
  startTimes: number[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function CompetitorAlert({
  logoDetections,
  competitorBrands = [],
  className,
  onDismiss,
  onBrandClick
}: CompetitorAlertProps) {
  const t = useTranslations('creatorReport.competitorAlert');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  // Find competitor brands in logo detections
  const detectedCompetitors = useMemo(() => {
    if (!logoDetections || competitorBrands.length === 0) return [];

    const competitors: CompetitorBrand[] = [];
    const competitorSet = new Set(competitorBrands.map(b => b.toLowerCase()));

    for (const logo of logoDetections) {
      if (competitorSet.has(logo.brand.toLowerCase())) {
        competitors.push({
          brand: logo.brand,
          totalDuration: logo.totalDuration,
          appearances: logo.appearances.length,
          likelySponsor: logo.likelySponsor,
          startTimes: logo.appearances.map(a => a.startTime),
        });
      }
    }

    return competitors.sort((a, b) => b.totalDuration - a.totalDuration);
  }, [logoDetections, competitorBrands]);

  // Calculate total competitor exposure
  const totalCompetitorExposure = useMemo(() => {
    return detectedCompetitors.reduce((sum, c) => sum + c.totalDuration, 0);
  }, [detectedCompetitors]);

  // Check if any competitor is likely sponsored
  const hasCompetitorSponsorship = detectedCompetitors.some(c => c.likelySponsor);

  if (isDismissed || detectedCompetitors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        hasCompetitorSponsorship
          ? 'bg-red-950/50 border-red-800'
          : 'bg-amber-950/30 border-amber-800/50',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 cursor-pointer',
          hasCompetitorSponsorship
            ? 'bg-red-900/30'
            : 'bg-amber-900/20'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-1.5 rounded-full',
            hasCompetitorSponsorship
              ? 'bg-red-500/20'
              : 'bg-amber-500/20'
          )}>
            <AlertTriangle className={cn(
              'w-4 h-4',
              hasCompetitorSponsorship
                ? 'text-red-400'
                : 'text-amber-400'
            )} />
          </div>
          <div>
            <h3 className={cn(
              'text-sm font-medium',
              hasCompetitorSponsorship
                ? 'text-red-300'
                : 'text-amber-300'
            )}>
              {t('title')}
            </h3>
            <p className="text-xs text-zinc-500">
              {detectedCompetitors.length} competitor{detectedCompetitors.length !== 1 ? 's' : ''} detected
              {hasCompetitorSponsorship && (
                <span className="text-red-400 ml-2">(Potential sponsorship)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Total exposure badge */}
          <div className={cn(
            'px-2 py-1 rounded text-xs',
            hasCompetitorSponsorship
              ? 'bg-red-500/20 text-red-300'
              : 'bg-amber-500/20 text-amber-300'
          )}>
            <Clock className="w-3 h-3 inline mr-1" />
            {formatDuration(totalCompetitorExposure)}
          </div>

          {/* Expand/Collapse */}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}

          {/* Dismiss */}
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
                onDismiss();
              }}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 py-3 space-y-3">
          <p className="text-sm text-zinc-400">
            {t('description')}
          </p>

          {/* Competitor List */}
          <div className="space-y-2">
            {detectedCompetitors.map((competitor, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg',
                  competitor.likelySponsor
                    ? 'bg-red-900/20 border border-red-800/50'
                    : 'bg-zinc-800/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Tag className={cn(
                    'w-4 h-4',
                    competitor.likelySponsor ? 'text-red-400' : 'text-zinc-500'
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium',
                        competitor.likelySponsor ? 'text-red-300' : 'text-zinc-300'
                      )}>
                        {competitor.brand}
                      </span>
                      {competitor.likelySponsor && (
                        <span className="px-1.5 py-0.5 bg-red-500/30 text-red-400 text-[10px] rounded">
                          SPONSOR
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                      <span>{formatDuration(competitor.totalDuration)} screen time</span>
                      <span>{competitor.appearances} appearance{competitor.appearances !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Jump to timestamps */}
                {onBrandClick && competitor.startTimes.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {competitor.startTimes.slice(0, 3).map((time, j) => (
                      <button
                        key={j}
                        onClick={() => onBrandClick(competitor.brand, time)}
                        className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 transition-colors"
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                    {competitor.startTimes.length > 3 && (
                      <span className="px-2 py-1 text-[10px] text-zinc-500">
                        +{competitor.startTimes.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Total exposure summary */}
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg border',
            hasCompetitorSponsorship
              ? 'bg-red-950/50 border-red-800/50'
              : 'bg-zinc-800/30 border-zinc-700'
          )}>
            <span className="text-sm text-zinc-400">{t('exposure')}</span>
            <span className={cn(
              'text-sm font-medium',
              hasCompetitorSponsorship ? 'text-red-400' : 'text-amber-400'
            )}>
              {formatDuration(totalCompetitorExposure)} total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Compact version for summary view
export function CompetitorAlertCompact({
  logoDetections,
  competitorBrands = [],
  className
}: Omit<CompetitorAlertProps, 'onDismiss' | 'onBrandClick'>) {
  const t = useTranslations('creatorReport.competitorAlert');

  const detectedCompetitors = useMemo(() => {
    if (!logoDetections || competitorBrands.length === 0) return [];
    const competitorSet = new Set(competitorBrands.map(b => b.toLowerCase()));
    return logoDetections.filter(l => competitorSet.has(l.brand.toLowerCase()));
  }, [logoDetections, competitorBrands]);

  if (detectedCompetitors.length === 0) return null;

  const hasSponsorship = detectedCompetitors.some(l => l.likelySponsor);

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      hasSponsorship
        ? 'bg-red-950/50 border border-red-800'
        : 'bg-amber-950/30 border border-amber-800/50',
      className
    )}>
      <AlertTriangle className={cn(
        'w-4 h-4',
        hasSponsorship ? 'text-red-400' : 'text-amber-400'
      )} />
      <span className={cn(
        'text-sm',
        hasSponsorship ? 'text-red-300' : 'text-amber-300'
      )}>
        {detectedCompetitors.length} competitor{detectedCompetitors.length !== 1 ? 's' : ''} detected
      </span>
    </div>
  );
}
