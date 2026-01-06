import { ExternalLink, Gavel, Newspaper, MessageCircleWarning, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Finding } from '@/types';

interface FindingCardProps {
  finding: Finding;
}

const typeConfig = {
  court_case: { icon: Gavel, label: 'Court Case' },
  news_article: { icon: Newspaper, label: 'News Article' },
  social_controversy: { icon: MessageCircleWarning, label: 'Social Media' },
  other: { icon: AlertCircle, label: 'Other' },
};

const severityColors = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

export function FindingCard({ finding }: FindingCardProps) {
  const { icon: Icon, label } = typeConfig[finding.type];

  return (
    <div
      className={cn(
        'bg-zinc-800/50 rounded-lg p-4 border-l-4',
        severityColors[finding.severity]
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 text-zinc-400">
          <Icon className="w-4 h-4" />
          <span className="text-xs uppercase tracking-wide">{label}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 capitalize">
            {finding.severity}
          </span>
        </div>
        {finding.source.publishedDate && (
          <span className="text-xs text-zinc-500">
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
