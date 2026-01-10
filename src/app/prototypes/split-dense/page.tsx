'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dummyReport, type Finding, type Platform, formatEngagement } from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';

// Mock batch data
const mockCreators = [
  { id: '1', name: 'MrBeast', verdict: 'review' as const, risk: 'CRITICAL', flags: 20, posts: 48 },
  { id: '2', name: 'Emma Chamberlain', verdict: 'approve' as const, risk: 'LOW', flags: 2, posts: 156 },
  { id: '3', name: 'Logan Paul', verdict: 'approve' as const, risk: 'LOW', flags: 3, posts: 89 },
  { id: '4', name: 'Charli D\'Amelio', verdict: 'review' as const, risk: 'MEDIUM', flags: 5, posts: 234 },
  { id: '5', name: 'KSI', verdict: 'review' as const, risk: 'HIGH', flags: 11, posts: 67 },
];

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

const severityShort: Record<string, string> = {
  critical: 'CRT',
  high: 'HIG',
  medium: 'MED',
  low: 'LOW',
};

type ViewMode = 'list' | 'split';
type Filter = 'all' | 'flagged' | Platform;

export default function SplitDensePrototype() {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Finding | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const socialFindings = dummyReport.findings.filter(f => f.platform !== 'web');
  const webFindings = dummyReport.findings.filter(f => f.platform === 'web');

  const filteredFindings = socialFindings.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return f.severity === 'critical' || f.severity === 'high';
    return f.platform === filter;
  });

  const handleCreatorClick = (id: string) => {
    setSelectedCreator(id);
    setView('split');
    setSelectedPost(null);
  };

  // List View - Dense Table
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-300">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link
            href="/prototypes"
            className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-400 mb-4 text-xs"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </Link>

          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-sm font-medium">Q1 2025 Campaign</h1>
            <span className="text-xs text-zinc-600">{mockCreators.length} creators</span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[auto_1fr_80px_80px_60px_60px_80px] gap-2 px-2 py-1 text-xs text-zinc-600 border-b border-zinc-800">
            <div className="w-4" />
            <div>NAME</div>
            <div className="text-center">STATUS</div>
            <div className="text-center">RISK</div>
            <div className="text-right">FLAGS</div>
            <div className="text-right">POSTS</div>
            <div />
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-zinc-900">
            {mockCreators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => handleCreatorClick(creator.id)}
                className="w-full grid grid-cols-[auto_1fr_80px_80px_60px_60px_80px] gap-2 px-2 py-2 text-sm hover:bg-zinc-900/50 transition-colors items-center group"
              >
                {/* Status */}
                <div className={cn(
                  'w-1 h-4 rounded-sm',
                  creator.verdict === 'approve' && 'bg-emerald-600',
                  creator.verdict === 'review' && creator.risk === 'CRITICAL' && 'bg-red-600',
                  creator.verdict === 'review' && creator.risk === 'HIGH' && 'bg-orange-600',
                  creator.verdict === 'review' && creator.risk === 'MEDIUM' && 'bg-amber-600',
                )} />

                {/* Name */}
                <div className="text-left truncate">{creator.name}</div>

                {/* Verdict */}
                <div className="text-center">
                  <span className={cn(
                    'text-xs font-medium px-1.5 py-0.5 rounded',
                    creator.verdict === 'approve' && 'text-emerald-400 bg-emerald-950',
                    creator.verdict === 'review' && 'text-amber-400 bg-amber-950',
                  )}>
                    {creator.verdict.toUpperCase()}
                  </span>
                </div>

                {/* Risk */}
                <div className="text-center">
                  <span className={cn(
                    'text-xs',
                    creator.risk === 'CRITICAL' && 'text-red-500',
                    creator.risk === 'HIGH' && 'text-orange-500',
                    creator.risk === 'MEDIUM' && 'text-amber-500',
                    creator.risk === 'LOW' && 'text-zinc-500',
                  )}>
                    {creator.risk}
                  </span>
                </div>

                {/* Flags */}
                <div className="text-right tabular-nums text-zinc-400">{creator.flags}</div>

                {/* Posts */}
                <div className="text-right tabular-nums text-zinc-600">{creator.posts}</div>

                {/* Arrow */}
                <div className="flex justify-end">
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split View - Dense
  return (
    <div className="h-screen bg-zinc-950 flex flex-col text-zinc-300 overflow-hidden">
      {/* Compact Header */}
      <header className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('list')}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-medium">{dummyReport.creator.name}</span>
            <span className="text-xs text-zinc-600">
              {socialFindings.length} posts · {webFindings.length} web
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-medium px-2 py-0.5 rounded',
            dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-400 bg-emerald-950',
            dummyReport.summary.recommendation.action === 'review' && 'text-amber-400 bg-amber-950',
            dummyReport.summary.recommendation.action === 'reject' && 'text-red-400 bg-red-950',
          )}>
            {dummyReport.summary.recommendation.action.toUpperCase()}
          </span>
          <button className="p-1 text-zinc-600 hover:text-emerald-500 hover:bg-emerald-950 rounded transition-colors">
            <Check className="w-4 h-4" />
          </button>
          <button className="p-1 text-zinc-600 hover:text-red-500 hover:bg-red-950 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Compact Grid/List */}
        <div className="w-[55%] border-r border-zinc-800 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="shrink-0 px-3 py-2 border-b border-zinc-800 flex items-center gap-1 text-xs">
            {(['all', 'flagged', 'instagram', 'youtube', 'tiktok'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-1 rounded transition-colors capitalize',
                  filter === f
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900'
                )}
              >
                {f}
              </button>
            ))}
            <span className="ml-auto text-zinc-600">{filteredFindings.length}</span>
          </div>

          {/* Dense List */}
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-zinc-900">
              {filteredFindings.map((finding) => {
                const PlatformIcon = platformIcons[finding.platform];
                const isSelected = selectedPost?.id === finding.id;

                return (
                  <button
                    key={finding.id}
                    onClick={() => setSelectedPost(finding)}
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-zinc-900/50 transition-colors',
                      isSelected && 'bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {/* Severity */}
                      <span className={cn(
                        'text-[10px] font-mono w-7 shrink-0',
                        finding.severity === 'critical' && 'text-red-500',
                        finding.severity === 'high' && 'text-orange-500',
                        finding.severity === 'medium' && 'text-amber-500',
                        finding.severity === 'low' && 'text-zinc-600',
                      )}>
                        {severityShort[finding.severity]}
                      </span>

                      {/* Platform */}
                      <PlatformIcon className="w-3 h-3 text-zinc-600 shrink-0" />

                      {/* Title */}
                      <span className="text-sm truncate flex-1">{finding.title}</span>

                      {/* Engagement */}
                      {finding.engagement && (
                        <span className="text-xs text-zinc-600 tabular-nums shrink-0">
                          {finding.engagement.views
                            ? formatEngagement(finding.engagement.views)
                            : finding.engagement.likes
                              ? formatEngagement(finding.engagement.likes)
                              : ''}
                        </span>
                      )}

                      {/* Date */}
                      <span className="text-xs text-zinc-700 w-16 text-right shrink-0">
                        {finding.source.date.slice(5)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detail/Summary */}
        <div className="w-[45%] overflow-y-auto">
          {selectedPost ? (
            <div className="p-4 space-y-4">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← summary
              </button>

              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-medium leading-tight">{selectedPost.title}</h2>
                <span className={cn(
                  'text-[10px] font-mono shrink-0 px-1 py-0.5 rounded',
                  selectedPost.severity === 'critical' && 'text-red-400 bg-red-950',
                  selectedPost.severity === 'high' && 'text-orange-400 bg-orange-950',
                  selectedPost.severity === 'medium' && 'text-amber-400 bg-amber-950',
                  selectedPost.severity === 'low' && 'text-zinc-400 bg-zinc-800',
                )}>
                  {selectedPost.severity.toUpperCase()}
                </span>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                {(() => {
                  const Icon = platformIcons[selectedPost.platform];
                  return <Icon className="w-3 h-3" />;
                })()}
                <span>{selectedPost.source.date}</span>
                {selectedPost.engagement && (
                  <>
                    {selectedPost.engagement.views && (
                      <span>{formatEngagement(selectedPost.engagement.views)} views</span>
                    )}
                    {selectedPost.engagement.likes && (
                      <span>{formatEngagement(selectedPost.engagement.likes)} likes</span>
                    )}
                  </>
                )}
              </div>

              {/* Summary */}
              <p className="text-sm text-zinc-400 leading-relaxed">{selectedPost.summary}</p>

              {/* Content */}
              {selectedPost.postContent?.caption && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Caption</p>
                  <div className="text-sm text-zinc-300 bg-zinc-900 p-3 rounded leading-relaxed">
                    <HighlightedText
                      text={selectedPost.postContent.caption}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}

              {selectedPost.postContent?.transcript && (
                <div className="space-y-1">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Transcript</p>
                  <div className="text-sm text-zinc-300 bg-zinc-900 p-3 rounded leading-relaxed max-h-48 overflow-y-auto">
                    <HighlightedText
                      text={selectedPost.postContent.transcript}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}

              {/* Source */}
              <a
                href={selectedPost.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {selectedPost.source.title}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Verdict */}
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-sm font-medium uppercase',
                  dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-500',
                  dummyReport.summary.recommendation.action === 'review' && 'text-amber-500',
                  dummyReport.summary.recommendation.action === 'reject' && 'text-red-500',
                )}>
                  {dummyReport.summary.recommendation.action}
                </span>
                <span className={cn(
                  'text-xs',
                  dummyReport.creator.riskLevel === 'CRITICAL' && 'text-red-500',
                  dummyReport.creator.riskLevel === 'HIGH' && 'text-orange-500',
                  dummyReport.creator.riskLevel === 'MEDIUM' && 'text-amber-500',
                  dummyReport.creator.riskLevel === 'LOW' && 'text-emerald-500',
                )}>
                  {dummyReport.creator.riskLevel} RISK
                </span>
              </div>

              <p className="text-sm text-zinc-400 leading-relaxed">
                {dummyReport.summary.recommendation.rationale}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-zinc-900 rounded">
                <div className="text-center">
                  <div className="text-lg font-medium text-red-500">{dummyReport.stats.critical}</div>
                  <div className="text-[10px] text-zinc-600">CRIT</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-orange-500">{dummyReport.stats.high}</div>
                  <div className="text-[10px] text-zinc-600">HIGH</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-amber-500">{dummyReport.stats.medium}</div>
                  <div className="text-[10px] text-zinc-600">MED</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-zinc-500">{dummyReport.stats.low}</div>
                  <div className="text-[10px] text-zinc-600">LOW</div>
                </div>
              </div>

              {/* Key Points */}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Key Points</p>
                <ul className="space-y-1">
                  {dummyReport.summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-xs text-zinc-400 leading-relaxed flex gap-2">
                      <span className="text-zinc-700">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Web Findings */}
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">
                  Web ({webFindings.length})
                </p>
                <div className="space-y-1">
                  {webFindings.map((finding) => (
                    <div key={finding.id} className="flex items-center gap-2 text-xs">
                      <span className={cn(
                        'w-1 h-1 rounded-full shrink-0',
                        finding.severity === 'critical' && 'bg-red-500',
                        finding.severity === 'high' && 'bg-orange-500',
                        finding.severity === 'medium' && 'bg-amber-500',
                        finding.severity === 'low' && 'bg-zinc-600',
                      )} />
                      <span className="text-zinc-400 truncate">{finding.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
