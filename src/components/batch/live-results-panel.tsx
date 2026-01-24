'use client';

import { useState, useEffect } from 'react';
import { User, Globe, Instagram, Search, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskLevelBar } from '@/components/ui/risk-level-bar';
import type { RiskLevel } from '@/types';

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

interface SearchQuery {
  query: string;
  source: 'web' | 'instagram' | 'tiktok';
  status: 'pending' | 'searching' | 'found' | 'none';
  resultsCount?: number;
}

interface ResultItem {
  id: string;
  source: 'web' | 'instagram' | 'tiktok';
  title: string;
  url?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

interface CreatorInfo {
  name: string;
  avatarUrl?: string;
  handles?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
}

interface LiveResultsPanelProps {
  creator?: CreatorInfo;
  searchQueries?: SearchQuery[];
  results?: ResultItem[];
  riskLevel?: RiskLevel;
  riskCounts?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  verdict?: 'approve' | 'review' | 'pending';
  isComplete?: boolean;
  className?: string;
}

function QueryChip({ query }: { query: SearchQuery }) {
  const sourceIcons = {
    web: <Globe size={12} />,
    instagram: <Instagram size={12} />,
    tiktok: <TikTokIcon className="w-3 h-3" />,
  };

  const statusColors = {
    pending: 'border-zinc-700 text-zinc-600',
    searching: 'border-blue-500/50 text-blue-400 animate-pulse',
    found: 'border-emerald-500/50 text-emerald-400',
    none: 'border-zinc-700 text-zinc-500',
  };

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 border rounded-full text-xs',
      statusColors[query.status]
    )}>
      {sourceIcons[query.source]}
      <span className="truncate max-w-[120px]">{query.query}</span>
      {query.resultsCount !== undefined && query.status === 'found' && (
        <span className="text-emerald-400">({query.resultsCount})</span>
      )}
    </div>
  );
}

function ResultRow({ result }: { result: ResultItem }) {
  const sourceConfig = {
    web: { icon: <Globe size={14} />, color: 'text-zinc-400', label: 'Web' },
    instagram: { icon: <Instagram size={14} />, color: 'text-pink-400', label: 'Instagram' },
    tiktok: { icon: <TikTokIcon className="w-3.5 h-3.5" />, color: 'text-zinc-300', label: 'TikTok' },
  };

  const severityConfig = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  };

  const config = sourceConfig[result.source];

  return (
    <div className="flex items-start gap-3 py-2 group">
      <div className={cn('mt-0.5', config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 line-clamp-2 group-hover:text-zinc-100 transition-colors">
          {result.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-600">{config.label}</span>
          {result.severity && (
            <>
              <span className="text-zinc-700">·</span>
              <div className={cn('w-1.5 h-1.5 rounded-full', severityConfig[result.severity])} />
              <span className="text-xs text-zinc-600 capitalize">{result.severity}</span>
            </>
          )}
        </div>
      </div>
      {result.url && (
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

function RiskMeter({ level, counts }: { level?: RiskLevel; counts?: LiveResultsPanelProps['riskCounts'] }) {
  const riskConfig = {
    LOW: { color: 'text-emerald-400', bg: 'bg-emerald-500', position: 20 },
    MEDIUM: { color: 'text-amber-400', bg: 'bg-amber-500', position: 40 },
    HIGH: { color: 'text-orange-400', bg: 'bg-orange-500', position: 70 },
    CRITICAL: { color: 'text-red-400', bg: 'bg-red-500', position: 90 },
    UNKNOWN: { color: 'text-zinc-400', bg: 'bg-zinc-500', position: 50 },
  };

  const config = level ? riskConfig[level] : riskConfig.UNKNOWN;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">Risk Assessment</span>
        {level && (
          <span className={cn('text-sm font-medium uppercase', config.color)}>
            {level}
          </span>
        )}
      </div>

      {/* Visual meter */}
      <div className="relative h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-zinc-900 transition-all duration-500"
          style={{ left: `${config.position}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Counts */}
      {counts && (
        <RiskLevelBar
          critical={counts.critical}
          high={counts.high}
          medium={counts.medium}
          low={counts.low}
          showLabels
          size="sm"
        />
      )}
    </div>
  );
}

export function LiveResultsPanel({
  creator,
  searchQueries = [],
  results = [],
  riskLevel,
  riskCounts,
  verdict,
  isComplete = false,
  className,
}: LiveResultsPanelProps) {
  // Group results by source
  const webResults = results.filter(r => r.source === 'web');
  const instagramResults = results.filter(r => r.source === 'instagram');
  const tiktokResults = results.filter(r => r.source === 'tiktok');

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Creator header */}
      {creator && (
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-zinc-500" />
              )}
            </div>
            <div>
              <h3 className="text-zinc-100 font-medium">{creator.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {creator.handles?.instagram && (
                  <span className="text-xs text-zinc-500">@{creator.handles.instagram}</span>
                )}
                {creator.handles?.tiktok && (
                  <span className="text-xs text-zinc-500">@{creator.handles.tiktok}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search queries */}
      {searchQueries.length > 0 && (
        <div className="px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} className="text-zinc-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Search Queries</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchQueries.map((query, i) => (
              <QueryChip key={i} query={query} />
            ))}
          </div>
        </div>
      )}

      {/* Results sections */}
      <div className="flex-1 overflow-auto">
        {/* Web results */}
        {webResults.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Globe size={14} className="text-zinc-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Web ({webResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {webResults.slice(0, 5).map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Instagram results */}
        {instagramResults.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Instagram size={14} className="text-pink-400" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Instagram ({instagramResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {instagramResults.slice(0, 5).map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* TikTok results */}
        {tiktokResults.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-800/50">
            <div className="flex items-center gap-2 mb-3">
              <TikTokIcon className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                TikTok ({tiktokResults.length})
              </span>
            </div>
            <div className="space-y-1">
              {tiktokResults.slice(0, 5).map((result) => (
                <ResultRow key={result.id} result={result} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && !isComplete && (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <Search size={20} className="text-zinc-600" />
            </div>
            <p className="text-zinc-500 text-sm">Searching for results...</p>
          </div>
        )}
      </div>

      {/* Risk meter & verdict */}
      <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
        <RiskMeter level={riskLevel} counts={riskCounts} />

        {/* Verdict */}
        {isComplete && verdict && (
          <div className={cn(
            'mt-4 flex items-center justify-center gap-2 py-3 rounded-lg',
            verdict === 'approve' && 'bg-emerald-500/10',
            verdict === 'review' && 'bg-red-500/10'
          )}>
            {verdict === 'approve' ? (
              <>
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
                  Approve
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm font-medium text-red-400 uppercase tracking-wider">
                  Needs Review
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
