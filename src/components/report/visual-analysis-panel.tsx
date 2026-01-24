'use client';

import { Eye, Tag, Type, AlertTriangle, Shield, ShieldAlert, ShieldX, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { VideoTimeline } from './video-timeline';
import type { VisualAnalysisData } from '@/types';

interface VisualAnalysisPanelProps {
  analysis: VisualAnalysisData;
  showTimeline?: boolean;
}

const safetyConfig = {
  safe: { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-950/50', border: 'border-emerald-900/50', label: 'safe' },
  caution: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-950/50', border: 'border-amber-900/50', label: 'caution' },
  unsafe: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-950/50', border: 'border-red-900/50', label: 'unsafe' },
};

const confidenceColors = {
  high: 'text-zinc-200',
  medium: 'text-zinc-400',
  low: 'text-zinc-500',
};

const confidenceBadges = {
  high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

export function VisualAnalysisPanel({ analysis, showTimeline = true }: VisualAnalysisPanelProps) {
  const t = useTranslations('creatorReport.visualAnalysis');
  const { icon: SafetyIcon, color, bg, border, label } = safetyConfig[analysis.brandSafetyRating];

  const concerningActions = analysis.actions.filter(a => a.isConcerning);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/10 rounded-md">
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-purple-400" />
          <span className="text-xs text-purple-400">Twelve Labs</span>
        </div>
      </div>

      {/* Video Timeline */}
      {showTimeline && (
        <VideoTimeline analysis={analysis} className="pb-2 border-b border-zinc-800/50" />
      )}

      {/* Scene Context */}
      {analysis.sceneContext && (
        <div className="space-y-1">
          <p className="text-zinc-300 text-sm">
            <span className="text-zinc-500">{t('scene')}:</span> {analysis.sceneContext.setting}
          </p>
          {analysis.sceneContext.mood && (
            <p className="text-zinc-300 text-sm">
              <span className="text-zinc-500">{t('mood')}:</span> {analysis.sceneContext.mood}
            </p>
          )}
          {analysis.sceneContext.contentType && (
            <p className="text-zinc-300 text-sm">
              <span className="text-zinc-500">{t('contentType')}:</span> {analysis.sceneContext.contentType}
            </p>
          )}
        </div>
      )}

      {/* Brands Detected */}
      {analysis.brands.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-3 h-3 text-purple-400" />
            <span className="text-zinc-500 text-xs uppercase tracking-wider">{t('brandsDetected')}</span>
            <span className="text-zinc-600 text-xs">({analysis.brands.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.brands.map((brand, i) => (
              <div
                key={i}
                className={cn(
                  'inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm',
                  confidenceBadges[brand.confidence]
                )}
              >
                <span>{brand.brand}</span>
                <span className="text-[10px] opacity-70 uppercase">
                  {t(`confidence.${brand.confidence}`)}
                </span>
              </div>
            ))}
          </div>
          {analysis.brands.some(b => b.context) && (
            <div className="mt-3 space-y-1.5">
              {analysis.brands.filter(b => b.context).map((brand, i) => (
                <p key={i} className="text-xs text-zinc-500">
                  <span className="text-zinc-400">{brand.brand}:</span> {brand.context}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* On-Screen Text */}
      {analysis.textInVideo.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Type className="w-3 h-3 text-cyan-400" />
            <span className="text-zinc-500 text-xs">{t('onScreenText')}</span>
          </div>
          <div className="space-y-1">
            {analysis.textInVideo.map((text, i) => (
              <p key={i} className="text-zinc-300 text-sm">
                &ldquo;{text.text}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Visual Concerns */}
      {(concerningActions.length > 0 || analysis.sceneContext.concerns.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-zinc-500 text-xs">{t('visualConcerns')}</span>
          </div>
          <ul className="space-y-1">
            {concerningActions.map((action, i) => (
              <li key={`action-${i}`} className="text-amber-300 text-sm">
                {action.action}
                {action.reason && <span className="text-zinc-500"> - {action.reason}</span>}
              </li>
            ))}
            {analysis.sceneContext.concerns.map((concern, i) => (
              <li key={`concern-${i}`} className="text-amber-300 text-sm">
                {concern}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Safety Rating */}
      <div className={cn('flex items-center justify-between px-4 py-3 rounded-lg border', bg, border)}>
        <div className="flex items-center gap-3">
          <SafetyIcon className={cn('w-5 h-5', color)} />
          <div>
            <span className={cn('text-sm font-medium uppercase tracking-wider', color)}>
              {t(`safety.${label}`)}
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">Brand Safety Rating</p>
          </div>
        </div>
        {/* Classification score visualization */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((level) => {
            const isActive =
              (label === 'safe' && level <= 2) ||
              (label === 'caution' && level <= 3) ||
              (label === 'unsafe' && level <= 5);
            const levelColor =
              level <= 2 ? 'bg-emerald-500' :
              level <= 3 ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div
                key={level}
                className={cn(
                  'w-2 h-4 rounded-sm transition-all',
                  isActive ? levelColor : 'bg-zinc-800'
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface VisualAnalysisSummaryProps {
  findings: Array<{
    socialMediaSource?: {
      visualAnalysis?: VisualAnalysisData;
    };
  }>;
}

export function VisualAnalysisSummary({ findings }: VisualAnalysisSummaryProps) {
  const t = useTranslations('creatorReport.visualAnalysis');

  const visualFindings = findings.filter(f => f.socialMediaSource?.visualAnalysis);

  if (visualFindings.length === 0) return null;

  const safeCount = visualFindings.filter(
    f => f.socialMediaSource?.visualAnalysis?.brandSafetyRating === 'safe'
  ).length;
  const cautionCount = visualFindings.filter(
    f => f.socialMediaSource?.visualAnalysis?.brandSafetyRating === 'caution'
  ).length;
  const unsafeCount = visualFindings.filter(
    f => f.socialMediaSource?.visualAnalysis?.brandSafetyRating === 'unsafe'
  ).length;

  // Aggregate brands across all findings
  const brandCounts = new Map<string, number>();
  for (const finding of visualFindings) {
    const brands = finding.socialMediaSource?.visualAnalysis?.brands || [];
    for (const brand of brands) {
      brandCounts.set(brand.brand, (brandCounts.get(brand.brand) || 0) + 1);
    }
  }
  const topBrands = Array.from(brandCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div>
      <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
        {t('summaryTitle', { count: visualFindings.length })}
      </p>

      <div className="flex items-center gap-3 text-sm mb-3">
        <span className="text-emerald-400">{safeCount} {t('safety.safe').toLowerCase()}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-amber-400">{cautionCount} {t('safety.caution').toLowerCase()}</span>
        <span className="text-zinc-700">·</span>
        <span className="text-red-400">{unsafeCount} {t('safety.unsafe').toLowerCase()}</span>
      </div>

      {topBrands.length > 0 && (
        <div>
          <p className="text-zinc-500 text-xs mb-1">{t('brandsAcrossVideos')}</p>
          <p className="text-zinc-300 text-sm">
            {topBrands.map(([brand, count], i) => (
              <span key={brand}>
                {brand} ({count}){i < topBrands.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
