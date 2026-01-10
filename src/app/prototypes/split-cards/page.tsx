'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe, AlertCircle, ChevronRight, Heart, MessageCircle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dummyReport, type Finding, type Platform, formatEngagement } from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';

// Mock batch data
const mockCreators = [
  { id: '1', name: 'MrBeast', verdict: 'review' as const, risk: 'CRITICAL', flags: 20, handle: '@mrbeast' },
  { id: '2', name: 'Emma Chamberlain', verdict: 'approve' as const, risk: 'LOW', flags: 2, handle: '@emmachamberlain' },
  { id: '3', name: 'Logan Paul', verdict: 'approve' as const, risk: 'LOW', flags: 3, handle: '@loganpaul' },
  { id: '4', name: 'Charli D\'Amelio', verdict: 'review' as const, risk: 'MEDIUM', flags: 5, handle: '@charlidamelio' },
];

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

type ViewMode = 'list' | 'split';
type Filter = 'all' | 'flagged' | Platform;

export default function SplitCardsPrototype() {
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

  // List View - Cards
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <Link
            href="/prototypes"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-8 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Prototypes
          </Link>

          <div className="mb-8">
            <h1 className="text-xl font-semibold text-zinc-100 mb-1">Q1 2025 Campaign</h1>
            <p className="text-zinc-500 text-sm">{mockCreators.length} creators to review</p>
          </div>

          <div className="grid gap-4">
            {mockCreators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => handleCreatorClick(creator.id)}
                className="bg-zinc-900 rounded-xl p-5 text-left hover:bg-zinc-900/80 transition-colors group border border-zinc-800 hover:border-zinc-700"
              >
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    creator.verdict === 'approve' && 'bg-emerald-950 text-emerald-500',
                    creator.verdict === 'review' && creator.risk === 'CRITICAL' && 'bg-red-950 text-red-500',
                    creator.verdict === 'review' && creator.risk === 'HIGH' && 'bg-orange-950 text-orange-500',
                    creator.verdict === 'review' && creator.risk === 'MEDIUM' && 'bg-amber-950 text-amber-500',
                  )}>
                    {creator.verdict === 'approve' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-zinc-100">{creator.name}</h3>
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        creator.verdict === 'approve' && 'bg-emerald-950 text-emerald-400',
                        creator.verdict === 'review' && 'bg-amber-950 text-amber-400',
                      )}>
                        {creator.verdict === 'approve' ? 'Approved' : 'Needs Review'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500">{creator.handle}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={cn(
                        'text-lg font-semibold',
                        creator.flags > 10 && 'text-red-400',
                        creator.flags > 3 && creator.flags <= 10 && 'text-amber-400',
                        creator.flags <= 3 && 'text-zinc-400',
                      )}>
                        {creator.flags}
                      </div>
                      <div className="text-xs text-zinc-600">flags</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split View - Cards
  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header Card */}
      <header className="m-4 mb-0 bg-zinc-900 rounded-xl border border-zinc-800 p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('list')}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-zinc-100">{dummyReport.creator.name}</h1>
                <span className={cn(
                  'text-xs font-medium px-2.5 py-1 rounded-full',
                  dummyReport.summary.recommendation.action === 'approve' && 'bg-emerald-950 text-emerald-400',
                  dummyReport.summary.recommendation.action === 'review' && 'bg-amber-950 text-amber-400',
                  dummyReport.summary.recommendation.action === 'reject' && 'bg-red-950 text-red-400',
                )}>
                  {dummyReport.summary.recommendation.action === 'approve' ? 'Approved' : 'Needs Review'}
                </span>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">
                {socialFindings.length} posts analyzed · {webFindings.length} web findings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-950 hover:bg-emerald-900 rounded-lg transition-colors flex items-center gap-2">
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button className="px-4 py-2 text-sm font-medium text-red-400 bg-red-950 hover:bg-red-900 rounded-lg transition-colors flex items-center gap-2">
              <X className="w-4 h-4" />
              Flag
            </button>
          </div>
        </div>
      </header>

      {/* Main Split */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left: Content Grid */}
        <div className="w-[60%] bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col overflow-hidden">
          {/* Filter Bar */}
          <div className="px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              {(['all', 'flagged', 'instagram', 'youtube', 'tiktok'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors capitalize',
                    filter === f
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  )}
                >
                  {f}
                </button>
              ))}
              <span className="ml-auto text-sm text-zinc-600">{filteredFindings.length} items</span>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-3">
              {filteredFindings.map((finding) => {
                const PlatformIcon = platformIcons[finding.platform];
                const isFlagged = finding.severity === 'critical' || finding.severity === 'high';
                const isSelected = selectedPost?.id === finding.id;

                return (
                  <button
                    key={finding.id}
                    onClick={() => setSelectedPost(finding)}
                    className={cn(
                      'aspect-[4/5] relative rounded-lg overflow-hidden transition-all group',
                      'bg-zinc-800 hover:bg-zinc-750',
                      isSelected && 'ring-2 ring-zinc-500',
                      isFlagged && 'ring-1 ring-red-800'
                    )}
                  >
                    {/* Content placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlatformIcon className="w-8 h-8 text-zinc-700" />
                    </div>

                    {/* Severity badge */}
                    <div className={cn(
                      'absolute top-2 right-2 w-2 h-2 rounded-full',
                      finding.severity === 'critical' && 'bg-red-500',
                      finding.severity === 'high' && 'bg-orange-500',
                      finding.severity === 'medium' && 'bg-amber-500',
                      finding.severity === 'low' && 'bg-zinc-600',
                    )} />

                    {/* Platform badge */}
                    <div className="absolute top-2 left-2 p-1.5 bg-zinc-900/80 rounded-md">
                      <PlatformIcon className="w-3 h-3 text-zinc-400" />
                    </div>

                    {/* Bottom gradient */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-zinc-900 to-transparent">
                      <p className="text-xs text-zinc-300 line-clamp-2">{finding.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Context Panel */}
        <div className="w-[40%] bg-zinc-900 rounded-xl border border-zinc-800 overflow-y-auto">
          {selectedPost ? (
            <div className="p-6 space-y-6">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Back to summary
              </button>

              {/* Post Header */}
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-2.5 rounded-lg shrink-0',
                  selectedPost.severity === 'critical' && 'bg-red-950 text-red-400',
                  selectedPost.severity === 'high' && 'bg-orange-950 text-orange-400',
                  selectedPost.severity === 'medium' && 'bg-amber-950 text-amber-400',
                  selectedPost.severity === 'low' && 'bg-zinc-800 text-zinc-400',
                )}>
                  {(() => {
                    const Icon = platformIcons[selectedPost.platform];
                    return <Icon className="w-5 h-5" />;
                  })()}
                </div>
                <div>
                  <h2 className="font-medium text-zinc-100 leading-snug">{selectedPost.title}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{selectedPost.source.date}</p>
                </div>
              </div>

              {/* Severity Badge */}
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                selectedPost.severity === 'critical' && 'bg-red-950 text-red-400',
                selectedPost.severity === 'high' && 'bg-orange-950 text-orange-400',
                selectedPost.severity === 'medium' && 'bg-amber-950 text-amber-400',
                selectedPost.severity === 'low' && 'bg-zinc-800 text-zinc-400',
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  selectedPost.severity === 'critical' && 'bg-red-400',
                  selectedPost.severity === 'high' && 'bg-orange-400',
                  selectedPost.severity === 'medium' && 'bg-amber-400',
                  selectedPost.severity === 'low' && 'bg-zinc-400',
                )} />
                {selectedPost.severity.charAt(0).toUpperCase() + selectedPost.severity.slice(1)} Risk
              </div>

              {/* Summary */}
              <p className="text-sm text-zinc-400 leading-relaxed">{selectedPost.summary}</p>

              {/* Engagement */}
              {selectedPost.engagement && (
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {selectedPost.engagement.likes && (
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      {formatEngagement(selectedPost.engagement.likes)}
                    </span>
                  )}
                  {selectedPost.engagement.comments && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      {formatEngagement(selectedPost.engagement.comments)}
                    </span>
                  )}
                  {selectedPost.engagement.views && (
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      {formatEngagement(selectedPost.engagement.views)}
                    </span>
                  )}
                </div>
              )}

              {/* Caption */}
              {selectedPost.postContent?.caption && (
                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Caption</p>
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    <HighlightedText
                      text={selectedPost.postContent.caption}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedPost.postContent?.transcript && (
                <div className="bg-zinc-800 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">Transcript</p>
                  <div className="text-sm text-zinc-300 leading-relaxed">
                    <HighlightedText
                      text={selectedPost.postContent.transcript}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}

              {/* Source Link */}
              <a
                href={selectedPost.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                View Original
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Verdict Card */}
              <div className={cn(
                'rounded-lg p-4',
                dummyReport.summary.recommendation.action === 'approve' && 'bg-emerald-950/50',
                dummyReport.summary.recommendation.action === 'review' && 'bg-amber-950/50',
                dummyReport.summary.recommendation.action === 'reject' && 'bg-red-950/50',
              )}>
                <div className={cn(
                  'text-lg font-semibold uppercase',
                  dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-400',
                  dummyReport.summary.recommendation.action === 'review' && 'text-amber-400',
                  dummyReport.summary.recommendation.action === 'reject' && 'text-red-400',
                )}>
                  {dummyReport.summary.recommendation.action}
                </div>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
                  {dummyReport.summary.recommendation.rationale}
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Critical', count: dummyReport.stats.critical, color: 'text-red-400' },
                  { label: 'High', count: dummyReport.stats.high, color: 'text-orange-400' },
                  { label: 'Medium', count: dummyReport.stats.medium, color: 'text-amber-400' },
                  { label: 'Low', count: dummyReport.stats.low, color: 'text-zinc-400' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-zinc-800 rounded-lg p-3 text-center">
                    <div className={cn('text-xl font-semibold', stat.color)}>{stat.count}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Key Points */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Key Findings</h3>
                <ul className="space-y-2">
                  {dummyReport.summary.keyPoints.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-zinc-400">
                      <span className="text-zinc-600 shrink-0">•</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Web Findings */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Web Findings ({webFindings.length})</h3>
                <div className="space-y-2">
                  {webFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="flex items-start gap-3 p-3 bg-zinc-800 rounded-lg"
                    >
                      <div className={cn(
                        'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                        finding.severity === 'critical' && 'bg-red-500',
                        finding.severity === 'high' && 'bg-orange-500',
                        finding.severity === 'medium' && 'bg-amber-500',
                        finding.severity === 'low' && 'bg-zinc-600',
                      )} />
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-300 leading-snug">{finding.title}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{finding.source.title}</p>
                      </div>
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
