'use client';

import { Shield, ShieldAlert, ShieldX, AlertTriangle, Eye, Users, Flame, Pill, MessageSquareWarning, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { ContentClassification } from '@/types';
import type { SafetyRationale, CategoryScores } from '@/types/video-analysis';

interface SafetyScoreBreakdownProps {
  classification?: ContentClassification;
  brandSafetyRating?: 'safe' | 'caution' | 'unsafe';
  safetyRationale?: SafetyRationale;
  className?: string;
}

interface CategoryScoreDisplay {
  key: keyof CategoryScores | 'brandSafety';
  label: string;
  score: number;
  reason?: string;
  evidenceCount?: number;
  icon: typeof Shield;
  description: string;
}

function getScoreColor(score: number): { text: string; bg: string; border: string } {
  if (score >= 80) {
    return { text: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500/30' };
  }
  if (score >= 50) {
    return { text: 'text-amber-400', bg: 'bg-amber-500', border: 'border-amber-500/30' };
  }
  return { text: 'text-red-400', bg: 'bg-red-500', border: 'border-red-500/30' };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Low Risk';
  if (score >= 50) return 'Moderate';
  return 'High Risk';
}

/**
 * Extract score value from category score (handles both number and object formats)
 */
function extractScore(value: number | { score: number; reason?: string } | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  return value.score ?? fallback;
}

/**
 * Extract reason from category score if available
 */
function extractReason(value: number | { score: number; reason?: string } | undefined): string | undefined {
  if (value === undefined || typeof value === 'number') return undefined;
  return value.reason;
}

export function SafetyScoreBreakdown({
  classification,
  brandSafetyRating,
  safetyRationale,
  className
}: SafetyScoreBreakdownProps) {
  const t = useTranslations('creatorReport.safetyBreakdown');

  // Calculate overall score from classification or derive from brandSafetyRating
  const overallScore = classification?.overallSafetyScore
    ? Math.round(classification.overallSafetyScore * 100)
    : brandSafetyRating === 'safe' ? 85
    : brandSafetyRating === 'caution' ? 55
    : 25;

  // Get category scores from safetyRationale (new format) or classification (legacy format)
  const rationaleScores = safetyRationale?.categoryScores;
  const classificationScores = classification?.categoryScores || {};

  // Build categories with reasons from safetyRationale when available
  const categories: CategoryScoreDisplay[] = [
    {
      key: 'brandSafety',
      label: t('categories.brandSafety'),
      score: extractScore(classificationScores.brandSafety, overallScore),
      reason: extractReason(classificationScores.brandSafety),
      icon: Shield,
      description: t('descriptions.brandSafety'),
    },
    {
      key: 'profanity',
      label: t('categories.profanity') || 'Profanity',
      score: rationaleScores?.profanity?.score ?? extractScore(classificationScores.profanity, overallScore + 10 > 100 ? 100 : overallScore + 10),
      reason: rationaleScores?.profanity?.reason ?? extractReason(classificationScores.profanity),
      evidenceCount: rationaleScores?.profanity?.evidenceCount,
      icon: MessageSquareWarning,
      description: t('descriptions.profanity') || 'Explicit language or profanity',
    },
    {
      key: 'violence',
      label: t('categories.violence'),
      score: rationaleScores?.violence?.score ?? extractScore(classificationScores.violence, overallScore + 10 > 100 ? 100 : overallScore + 10),
      reason: rationaleScores?.violence?.reason ?? extractReason(classificationScores.violence),
      evidenceCount: rationaleScores?.violence?.evidenceCount,
      icon: AlertTriangle,
      description: t('descriptions.violence'),
    },
    {
      key: 'adult',
      label: t('categories.adultContent'),
      score: rationaleScores?.adult?.score ?? extractScore(classificationScores.adultContent, overallScore + 5 > 100 ? 100 : overallScore + 5),
      reason: rationaleScores?.adult?.reason ?? extractReason(classificationScores.adultContent),
      evidenceCount: rationaleScores?.adult?.evidenceCount,
      icon: Eye,
      description: t('descriptions.adultContent'),
    },
    {
      key: 'political',
      label: t('categories.political'),
      score: rationaleScores?.political?.score ?? extractScore(classificationScores.political, overallScore),
      reason: rationaleScores?.political?.reason ?? extractReason(classificationScores.political),
      evidenceCount: rationaleScores?.political?.evidenceCount,
      icon: Users,
      description: t('descriptions.political'),
    },
    {
      key: 'substances',
      label: t('categories.substanceUse'),
      score: rationaleScores?.substances?.score ?? extractScore(classificationScores.substanceUse, overallScore + 15 > 100 ? 100 : overallScore + 15),
      reason: rationaleScores?.substances?.reason ?? extractReason(classificationScores.substanceUse),
      evidenceCount: rationaleScores?.substances?.evidenceCount,
      icon: Pill,
      description: t('descriptions.substanceUse'),
    },
    {
      key: 'dangerous',
      label: t('categories.dangerous') || 'Dangerous Activities',
      score: rationaleScores?.dangerous?.score ?? extractScore(classificationScores.dangerous, overallScore + 10 > 100 ? 100 : overallScore + 10),
      reason: rationaleScores?.dangerous?.reason ?? extractReason(classificationScores.dangerous),
      evidenceCount: rationaleScores?.dangerous?.evidenceCount,
      icon: Zap,
      description: t('descriptions.dangerous') || 'Stunts or dangerous behavior',
    },
  ];

  const overallColors = getScoreColor(overallScore);
  const OverallIcon = overallScore >= 80 ? Shield : overallScore >= 50 ? ShieldAlert : ShieldX;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-500/10 rounded-md">
          <Shield className="w-4 h-4 text-blue-400" />
        </div>
        <span className="text-zinc-300 text-sm font-medium">{t('title')}</span>
      </div>

      {/* Overall Safety Gauge */}
      <div className={cn(
        'relative p-4 rounded-lg border bg-zinc-900/50',
        overallColors.border
      )}>
        <div className="flex items-center gap-4">
          {/* Gauge visualization */}
          <div className="relative w-20 h-20">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-zinc-800"
              />
              {/* Progress arc */}
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(overallScore / 100) * 201} 201`}
                className={overallColors.text}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-xl font-semibold', overallColors.text)}>
                {overallScore}
              </span>
            </div>
          </div>

          {/* Score details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <OverallIcon className={cn('w-5 h-5', overallColors.text)} />
              <span className={cn('text-lg font-medium', overallColors.text)}>
                {getScoreLabel(overallScore)}
              </span>
            </div>
            <p className="text-zinc-500 text-sm">
              {t('overallDescription')}
            </p>
          </div>
        </div>

        {/* Threshold indicators */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-500">80-100 {t('lowRisk')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-zinc-500">50-79 {t('moderate')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-zinc-500">0-49 {t('highRisk')}</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <p className="text-zinc-500 text-xs uppercase tracking-wider">
          {t('categoryBreakdown')}
        </p>

        {categories.map((category) => {
          // For category scores, higher means MORE risk (inverse of safety)
          // Convert to safety-oriented display (100 = safe, 0 = risky)
          const safetyScore = 100 - category.score;
          const colors = getScoreColor(safetyScore);
          const Icon = category.icon;
          const hasReason = category.reason && category.reason.length > 0;
          const hasEvidence = category.evidenceCount && category.evidenceCount > 0;

          return (
            <div key={category.key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-sm text-zinc-300">{category.label}</span>
                  {hasEvidence && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                      {category.evidenceCount} {category.evidenceCount === 1 ? 'flag' : 'flags'}
                    </span>
                  )}
                </div>
                <span className={cn('text-sm font-medium', colors.text)}>
                  {safetyScore}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${safetyScore}%` }}
                />
              </div>

              {/* Show reason if available, otherwise show description on hover */}
              {hasReason ? (
                <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                  {category.reason}
                </p>
              ) : (
                <p className="text-[10px] text-zinc-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {category.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Content Labels (from classification) */}
      {classification?.labels && classification.labels.length > 0 && (
        <div className="space-y-2">
          <p className="text-zinc-500 text-xs uppercase tracking-wider">
            {t('detectedContent')}
          </p>
          <div className="flex flex-wrap gap-2">
            {classification.labels.map((label, i) => {
              const confidence = Math.round(label.confidence * 100);
              const isHighConfidence = confidence >= 70;

              return (
                <div
                  key={i}
                  className={cn(
                    'px-2 py-1 rounded text-xs border',
                    isHighConfidence
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  )}
                >
                  <span>{label.label}</span>
                  <span className="ml-1.5 text-zinc-600">{confidence}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact inline version for summaries
export function SafetyScoreCompact({
  classification,
  brandSafetyRating,
  className
}: SafetyScoreBreakdownProps) {
  const score = classification?.overallSafetyScore
    ? Math.round(classification.overallSafetyScore * 100)
    : brandSafetyRating === 'safe' ? 85
    : brandSafetyRating === 'caution' ? 55
    : 25;

  const colors = getScoreColor(score);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
        colors.bg + '/20',
        colors.text
      )}>
        {score}
      </div>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', colors.bg)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
