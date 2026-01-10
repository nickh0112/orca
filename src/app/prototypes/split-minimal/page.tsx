'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dummyReport, type Finding, type Platform } from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';

// Mock batch data for demonstration
const mockCreators = [
  { id: '1', name: 'MrBeast', verdict: 'review' as const, risk: 'CRITICAL', flags: 20 },
  { id: '2', name: 'Emma Chamberlain', verdict: 'approve' as const, risk: 'LOW', flags: 2 },
  { id: '3', name: 'Logan Paul', verdict: 'approve' as const, risk: 'LOW', flags: 3 },
  { id: '4', name: 'Charli D\'Amelio', verdict: 'review' as const, risk: 'MEDIUM', flags: 5 },
];

// Mock brand partnerships
const mockBrands = [
  { name: 'Feastables', type: 'owned', isCompetitor: false },
  { name: 'Prime Hydration', type: 'equity', isCompetitor: false },
  { name: 'Nike', type: 'sponsored', isCompetitor: false },
  { name: 'Raid Shadow Legends', type: 'sponsored', isCompetitor: false },
  { name: 'Honey', type: 'sponsored', isCompetitor: false },
  { name: 'Current', type: 'sponsored', isCompetitor: false },
  { name: 'Shopify', type: 'sponsored', isCompetitor: false },
  { name: 'ExpressVPN', type: 'sponsored', isCompetitor: false },
];

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

type ViewMode = 'list' | 'split';
type Filter = 'all' | 'flagged' | Platform;

export default function SplitMinimalPrototype() {
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

  // List View
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <Link
            href="/prototypes"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-12 text-sm tracking-wide"
          >
            <ArrowLeft className="w-4 h-4" />
            prototypes
          </Link>

          <div className="mb-16">
            <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">Q1 2025 Campaign</h1>
            <p className="text-zinc-600 text-sm">4 creators to review</p>
          </div>

          <div className="space-y-px">
            {mockCreators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => handleCreatorClick(creator.id)}
                className="w-full group"
              >
                <div className="flex items-center py-5 border-b border-zinc-900 hover:border-zinc-800 transition-colors">
                  {/* Status dot */}
                  <div className="w-16 flex justify-center">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      creator.verdict === 'approve' && 'bg-emerald-500',
                      creator.verdict === 'review' && creator.risk === 'CRITICAL' && 'bg-red-500',
                      creator.verdict === 'review' && creator.risk === 'MEDIUM' && 'bg-amber-500',
                    )} />
                  </div>

                  {/* Name */}
                  <div className="flex-1 text-left">
                    <span className="text-zinc-300 group-hover:text-zinc-100 transition-colors">
                      {creator.name}
                    </span>
                  </div>

                  {/* Verdict */}
                  <div className="w-32 text-left">
                    <span className={cn(
                      'text-sm uppercase tracking-wider',
                      creator.verdict === 'approve' && 'text-emerald-600',
                      creator.verdict === 'review' && 'text-zinc-500',
                    )}>
                      {creator.verdict}
                    </span>
                  </div>

                  {/* Flags */}
                  <div className="w-20 text-right">
                    <span className="text-zinc-600 text-sm">{creator.flags}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split View
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setView('list')}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-zinc-200 font-light tracking-wide">{dummyReport.creator.name}</h1>
              <p className="text-zinc-600 text-sm">
                {socialFindings.length} posts · {mockBrands.length} brands · {webFindings.length} findings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={cn(
              'text-sm uppercase tracking-wider px-3 py-1',
              dummyReport.creator.riskLevel === 'CRITICAL' && 'text-red-500',
              dummyReport.creator.riskLevel === 'HIGH' && 'text-orange-500',
              dummyReport.creator.riskLevel === 'LOW' && 'text-emerald-500',
            )}>
              {dummyReport.summary.recommendation.action}
            </span>
            <button className="p-2 text-zinc-600 hover:text-emerald-500 transition-colors">
              <Check className="w-5 h-5" />
            </button>
            <button className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Content Grid */}
        <div className="w-[60%] border-r border-zinc-900 overflow-y-auto">
          {/* Filter bar */}
          <div className="sticky top-0 bg-zinc-950 px-6 py-4 border-b border-zinc-900">
            <div className="flex items-center gap-6 text-sm">
              {(['all', 'flagged', 'instagram', 'youtube', 'tiktok'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'transition-colors capitalize',
                    filter === f ? 'text-zinc-200' : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-6">
            <div className="grid grid-cols-4 gap-1">
              {filteredFindings.map((finding) => {
                const PlatformIcon = platformIcons[finding.platform];
                const isFlagged = finding.severity === 'critical' || finding.severity === 'high';
                const isSelected = selectedPost?.id === finding.id;

                return (
                  <button
                    key={finding.id}
                    onClick={() => setSelectedPost(finding)}
                    className={cn(
                      'aspect-square relative bg-zinc-900 transition-all group',
                      isSelected && 'ring-1 ring-zinc-600',
                      isFlagged && 'ring-1 ring-red-900'
                    )}
                  >
                    {/* Placeholder for thumbnail */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlatformIcon className="w-6 h-6 text-zinc-800" />
                    </div>

                    {/* Severity indicator */}
                    {isFlagged && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-zinc-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                      <span className="text-xs text-zinc-400 line-clamp-2">{finding.title}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Context Panel */}
        <div className="w-[40%] overflow-y-auto">
          {selectedPost ? (
            // Post Detail
            <div className="p-8">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-zinc-600 hover:text-zinc-400 text-sm mb-6 transition-colors"
              >
                ← back to summary
              </button>

              <div className="space-y-8">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const Icon = platformIcons[selectedPost.platform];
                      return <Icon className="w-4 h-4 text-zinc-600" />;
                    })()}
                    <span className={cn(
                      'text-xs uppercase tracking-wider',
                      selectedPost.severity === 'critical' && 'text-red-500',
                      selectedPost.severity === 'high' && 'text-orange-500',
                      selectedPost.severity === 'medium' && 'text-amber-500',
                      selectedPost.severity === 'low' && 'text-emerald-500',
                    )}>
                      {selectedPost.severity}
                    </span>
                  </div>
                  <h2 className="text-zinc-200 font-light">{selectedPost.title}</h2>
                  <p className="text-zinc-600 text-sm mt-1">{selectedPost.source.date}</p>
                </div>

                {/* Summary */}
                <p className="text-zinc-400 text-sm leading-relaxed">{selectedPost.summary}</p>

                {/* Caption */}
                {selectedPost.postContent?.caption && (
                  <div>
                    <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">Caption</p>
                    <div className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/50 p-4 rounded">
                      <HighlightedText
                        text={selectedPost.postContent.caption}
                        highlights={selectedPost.postContent.flaggedSpans}
                      />
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {selectedPost.postContent?.transcript && (
                  <div>
                    <p className="text-zinc-600 text-xs uppercase tracking-wider mb-2">Transcript</p>
                    <div className="text-zinc-300 text-sm leading-relaxed bg-zinc-900/50 p-4 rounded">
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
                  className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  View source
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            // Summary
            <div className="p-8 space-y-10">
              {/* Verdict */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Verdict</p>
                <span className={cn(
                  'text-lg uppercase tracking-wider',
                  dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-500',
                  dummyReport.summary.recommendation.action === 'review' && 'text-amber-500',
                  dummyReport.summary.recommendation.action === 'reject' && 'text-red-500',
                )}>
                  {dummyReport.summary.recommendation.action}
                </span>
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                  {dummyReport.summary.recommendation.rationale}
                </p>
              </div>

              {/* Brand Partnerships */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                  Brand Partnerships ({mockBrands.length})
                </p>
                <div className="space-y-2">
                  {mockBrands.map((brand, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-zinc-300 text-sm">{brand.name}</span>
                      <span className="text-zinc-600 text-xs">{brand.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Web Findings / Risky Links */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                  Research Findings ({webFindings.length})
                </p>
                <div className="space-y-4">
                  {webFindings.map((finding) => (
                    <a
                      key={finding.id}
                      href={finding.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full mt-2 shrink-0',
                          finding.severity === 'critical' && 'bg-red-500',
                          finding.severity === 'high' && 'bg-orange-500',
                          finding.severity === 'medium' && 'bg-amber-500',
                          finding.severity === 'low' && 'bg-zinc-600',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-300 text-sm group-hover:text-zinc-100 transition-colors">
                            {finding.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-zinc-600 text-xs">{finding.source.title}</span>
                            <span className="text-zinc-700 text-xs">·</span>
                            <span className="text-zinc-700 text-xs">{finding.source.date}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Risk Breakdown</p>
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xl text-red-500 font-light">{dummyReport.stats.critical}</span>
                    <span className="text-zinc-600 text-sm ml-1">critical</span>
                  </div>
                  <div>
                    <span className="text-xl text-orange-500 font-light">{dummyReport.stats.high}</span>
                    <span className="text-zinc-600 text-sm ml-1">high</span>
                  </div>
                  <div>
                    <span className="text-xl text-amber-500 font-light">{dummyReport.stats.medium}</span>
                    <span className="text-zinc-600 text-sm ml-1">med</span>
                  </div>
                  <div>
                    <span className="text-xl text-zinc-500 font-light">{dummyReport.stats.low}</span>
                    <span className="text-zinc-600 text-sm ml-1">low</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
