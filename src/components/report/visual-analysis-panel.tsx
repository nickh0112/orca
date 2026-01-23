'use client';

import { Eye, Tag, Type, AlertTriangle, Shield, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { VisualAnalysisData } from '@/types';

interface VisualAnalysisPanelProps {
  analysis: VisualAnalysisData;
}

const safetyConfig = {
  safe: { icon: Shield, color: 'text-emerald-400', bg: 'bg-emerald-950/50', label: 'safe' },
  caution: { icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-950/50', label: 'caution' },
  unsafe: { icon: ShieldX, color: 'text-red-400', bg: 'bg-red-950/50', label: 'unsafe' },
};

const confidenceColors = {
  high: 'text-zinc-200',
  medium: 'text-zinc-400',
  low: 'text-zinc-500',
};

export function VisualAnalysisPanel({ analysis }: VisualAnalysisPanelProps) {
  const t = useTranslations('creatorReport.visualAnalysis');
  const { icon: SafetyIcon, color, bg, label } = safetyConfig[analysis.brandSafetyRating];

  const concerningActions = analysis.actions.filter(a => a.isConcerning);

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-blue-400" />
        <span className="text-zinc-400 text-xs uppercase tracking-wider">{t('title')}</span>
      </div>

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
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3 h-3 text-purple-400" />
            <span className="text-zinc-500 text-xs">{t('brandsDetected')}</span>
          </div>
          <div className="space-y-1.5">
            {analysis.brands.map((brand, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className={cn('text-sm', confidenceColors[brand.confidence])}>
                  {brand.brand}
                </span>
                <span className="text-zinc-600 text-xs">
                  {t(`confidence.${brand.confidence}`)}
                </span>
              </div>
            ))}
          </div>
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
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded', bg)}>
        <SafetyIcon className={cn('w-4 h-4', color)} />
        <span className={cn('text-sm uppercase tracking-wider', color)}>
          {t(`safety.${label}`)}
        </span>
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
