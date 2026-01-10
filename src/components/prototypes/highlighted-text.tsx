'use client';

import { cn } from '@/lib/utils';
import type { FlaggedSpan, Severity } from '@/lib/dummy-report-data';

interface HighlightedTextProps {
  text: string;
  highlights?: FlaggedSpan[];
  className?: string;
  showReasons?: boolean;
}

const severityHighlightColors: Record<Severity, string> = {
  critical: 'bg-red-500/30 border-b-2 border-red-500',
  high: 'bg-orange-500/30 border-b-2 border-orange-500',
  medium: 'bg-yellow-500/30 border-b-2 border-yellow-500',
  low: 'bg-green-500/30 border-b-2 border-green-500',
};

export function HighlightedText({
  text,
  highlights = [],
  className,
  showReasons = false,
}: HighlightedTextProps) {
  if (!highlights || highlights.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Sort highlights by start position
  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start);

  // Build segments
  const segments: Array<{ text: string; highlight?: FlaggedSpan }> = [];
  let lastIndex = 0;

  for (const highlight of sortedHighlights) {
    // Add text before this highlight
    if (highlight.start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, highlight.start) });
    }
    // Add highlighted text
    segments.push({
      text: text.slice(highlight.start, highlight.end),
      highlight
    });
    lastIndex = highlight.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.highlight) {
          return (
            <span key={i} className="relative group inline">
              <span
                className={cn(
                  'px-0.5 rounded cursor-help',
                  severityHighlightColors[segment.highlight.severity]
                )}
              >
                {segment.text}
              </span>
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {segment.highlight.reason}
              </span>
            </span>
          );
        }
        return <span key={i}>{segment.text}</span>;
      })}
      {showReasons && highlights.length > 0 && (
        <div className="mt-2 space-y-1">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className={cn(
                'mt-0.5 w-2 h-2 rounded-full shrink-0',
                h.severity === 'critical' && 'bg-red-500',
                h.severity === 'high' && 'bg-orange-500',
                h.severity === 'medium' && 'bg-yellow-500',
                h.severity === 'low' && 'bg-green-500',
              )} />
              <span className="text-zinc-400">
                <span className="text-zinc-300">&quot;{h.text}&quot;</span> — {h.reason}
              </span>
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
