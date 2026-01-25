'use client';

import { AlertTriangle, AlertCircle, Info, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FindingItem } from '@/hooks/use-research-feed';

interface FindingsStreamProps {
  findings: FindingItem[];
  maxVisible?: number;
}

function getSeverityStyles(severity: string): {
  bg: string;
  border: string;
  text: string;
  icon: typeof AlertTriangle;
} {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: AlertCircle,
      };
    case 'high':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-400',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        icon: FileWarning,
      };
    case 'low':
    default:
      return {
        bg: 'bg-zinc-800/50',
        border: 'border-zinc-700',
        text: 'text-zinc-400',
        icon: Info,
      };
  }
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    court_case: 'Legal',
    news_article: 'News',
    social_controversy: 'Controversy',
    social_post: 'Social',
    reddit_mention: 'Reddit',
    competitor_partnership: 'Competitor',
    other: 'Other',
  };
  return labels[type] || type;
}

export function FindingsStream({ findings, maxVisible = 5 }: FindingsStreamProps) {
  const visibleFindings = findings.slice(-maxVisible);
  const hiddenCount = findings.length - maxVisible;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium uppercase tracking-wider">
          <AlertTriangle className="w-3 h-3" />
          <span>Findings</span>
        </div>
        {findings.length > 0 && (
          <span className="text-xs text-zinc-600">{findings.length} total</span>
        )}
      </div>

      <div className="space-y-1.5">
        {hiddenCount > 0 && (
          <div className="text-xs text-zinc-600 pl-2">
            +{hiddenCount} more findings
          </div>
        )}

        {visibleFindings.map((finding, index) => {
          const styles = getSeverityStyles(finding.severity);
          const Icon = styles.icon;

          return (
            <div
              key={`${finding.title}-${index}`}
              className={cn(
                'flex items-start gap-2 px-3 py-2 rounded-lg border transition-all',
                styles.bg,
                styles.border,
                'animate-in slide-in-from-left-2 duration-300'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Icon className={cn('w-3.5 h-3.5 mt-0.5 flex-shrink-0', styles.text)} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-medium truncate', styles.text)}>
                    {finding.title}
                  </span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                      styles.bg,
                      styles.text
                    )}
                  >
                    {getTypeLabel(finding.type)}
                  </span>
                </div>
              </div>

              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase flex-shrink-0',
                  styles.text
                )}
              >
                {finding.severity}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
