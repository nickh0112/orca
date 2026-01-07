import {
  ExternalLink,
  Gavel,
  Newspaper,
  MessageCircleWarning,
  AlertCircle,
  Instagram,
  MessageSquare,
  ShieldCheck,
  ShieldQuestion,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Finding, ConfidenceLevel, PersonMatch } from '@/types';

interface FindingCardProps {
  finding: Finding;
}

const typeConfig = {
  court_case: { icon: Gavel, label: 'Court Case', color: 'text-red-400' },
  news_article: { icon: Newspaper, label: 'News Article', color: 'text-blue-400' },
  social_controversy: { icon: MessageCircleWarning, label: 'Social Media', color: 'text-yellow-400' },
  social_post: { icon: Instagram, label: 'Social Post', color: 'text-pink-400' },
  reddit_mention: { icon: MessageSquare, label: 'Reddit', color: 'text-orange-400' },
  other: { icon: AlertCircle, label: 'Other', color: 'text-zinc-400' },
};

const severityColors = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

const confidenceConfig: Record<ConfidenceLevel, { color: string; bg: string }> = {
  high: { color: 'text-green-400', bg: 'bg-green-500/10' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { color: 'text-orange-400', bg: 'bg-orange-500/10' },
};

const matchConfig: Record<PersonMatch, { icon: typeof ShieldCheck; label: string; color: string }> = {
  yes: { icon: ShieldCheck, label: 'Confirmed match', color: 'text-green-400' },
  uncertain: { icon: ShieldQuestion, label: 'Uncertain match', color: 'text-yellow-400' },
  no: { icon: ShieldAlert, label: 'May not be same person', color: 'text-red-400' },
};

export function FindingCard({ finding }: FindingCardProps) {
  const config = typeConfig[finding.type] || typeConfig.other;
  const { icon: Icon, label, color } = config;

  const validation = finding.validation;
  const matchInfo = validation ? matchConfig[validation.isSamePerson] : null;
  const confidenceInfo = validation ? confidenceConfig[validation.confidence] : null;
  const MatchIcon = matchInfo?.icon;

  return (
    <div
      className={cn(
        'bg-zinc-800/50 rounded-lg p-4 border-l-4',
        severityColors[finding.severity]
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={cn('w-4 h-4', color)} />
          <span className={cn('text-xs uppercase tracking-wide', color)}>{label}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 capitalize text-zinc-300">
            {finding.severity}
          </span>
          {validation && matchInfo && confidenceInfo && MatchIcon && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded flex items-center gap-1',
                confidenceInfo.bg,
                matchInfo.color
              )}
              title={`${matchInfo.label} (${validation.confidence} confidence)${validation.reason ? `: ${validation.reason}` : ''}`}
            >
              <MatchIcon className="w-3 h-3" />
              <span className="capitalize">{validation.confidence}</span>
            </span>
          )}
        </div>
        {finding.source.publishedDate && (
          <span className="text-xs text-zinc-500 shrink-0">
            {new Date(finding.source.publishedDate).toLocaleDateString()}
          </span>
        )}
      </div>

      <h4 className="text-zinc-100 font-medium mb-2 line-clamp-2">
        {finding.title}
      </h4>

      <p className="text-sm text-zinc-400 mb-3 line-clamp-3">
        {finding.summary}
      </p>

      {validation?.reason && validation.isSamePerson === 'uncertain' && (
        <p className="text-xs text-yellow-400/70 mb-3 italic">
          Note: {validation.reason}
        </p>
      )}

      <a
        href={finding.source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white transition-colors"
      >
        <span className="truncate max-w-xs">{finding.source.title}</span>
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    </div>
  );
}
