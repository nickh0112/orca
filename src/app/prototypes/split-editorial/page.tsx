'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Instagram, Youtube, Music2, Globe, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dummyReport, type Finding, type Platform, formatEngagement } from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';

// Mock batch data
const mockCreators = [
  { id: '1', name: 'MrBeast', verdict: 'review' as const, risk: 'CRITICAL', flags: 20, summary: 'Multiple legal issues and regulatory violations require thorough review.' },
  { id: '2', name: 'Emma Chamberlain', verdict: 'approve' as const, risk: 'LOW', flags: 2, summary: 'Clean profile with minor disclosure notes.' },
  { id: '3', name: 'Logan Paul', verdict: 'approve' as const, risk: 'LOW', flags: 3, summary: 'No significant brand safety concerns identified.' },
  { id: '4', name: 'Charli D\'Amelio', verdict: 'review' as const, risk: 'MEDIUM', flags: 5, summary: 'Moderate concerns regarding competitor mentions.' },
];

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

type ViewMode = 'list' | 'split';
type Filter = 'all' | 'flagged' | Platform;

export default function SplitEditorialPrototype() {
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

  // List View - Editorial Magazine Style
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="max-w-4xl mx-auto px-8 py-16">
          <Link
            href="/prototypes"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-400 mb-16 text-sm tracking-wide"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>

          {/* Magazine Header */}
          <header className="mb-16 pb-8 border-b border-zinc-800">
            <p className="text-zinc-600 text-xs tracking-[0.3em] uppercase mb-4">Campaign Review</p>
            <h1 className="text-4xl font-serif text-zinc-100 mb-4">Q1 2025 Vetting Report</h1>
            <p className="text-zinc-500 text-lg leading-relaxed max-w-2xl">
              {mockCreators.length} creators analyzed for brand safety, legal compliance, and content review.
            </p>
          </header>

          {/* Creator Articles */}
          <div className="space-y-12">
            {mockCreators.map((creator, index) => (
              <article key={creator.id} className="group">
                <button
                  onClick={() => handleCreatorClick(creator.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-8">
                    {/* Index */}
                    <span className="text-zinc-700 text-sm tabular-nums pt-1 w-8">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h2 className="text-2xl font-serif text-zinc-100 group-hover:text-zinc-300 transition-colors">
                          {creator.name}
                        </h2>
                        <span className={cn(
                          'text-xs tracking-wider uppercase',
                          creator.verdict === 'approve' && 'text-emerald-600',
                          creator.verdict === 'review' && 'text-amber-600',
                        )}>
                          {creator.verdict === 'approve' ? 'Cleared' : 'Review Required'}
                        </span>
                      </div>
                      <p className="text-zinc-500 leading-relaxed mb-3">{creator.summary}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className={cn(
                          creator.risk === 'CRITICAL' && 'text-red-500',
                          creator.risk === 'HIGH' && 'text-orange-500',
                          creator.risk === 'MEDIUM' && 'text-amber-500',
                          creator.risk === 'LOW' && 'text-zinc-600',
                        )}>
                          {creator.risk} Risk
                        </span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-zinc-600">{creator.flags} findings</span>
                      </div>
                    </div>
                  </div>
                </button>
                {index < mockCreators.length - 1 && (
                  <div className="mt-12 border-b border-zinc-900" />
                )}
              </article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Split View - Editorial
  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Editorial Header */}
      <header className="px-8 py-6 border-b border-zinc-900 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setView('list')}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-zinc-600 text-xs tracking-[0.2em] uppercase mb-1">Creator Report</p>
              <h1 className="text-2xl font-serif text-zinc-100">{dummyReport.creator.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className={cn(
              'text-sm tracking-wide',
              dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-500',
              dummyReport.summary.recommendation.action === 'review' && 'text-amber-500',
              dummyReport.summary.recommendation.action === 'reject' && 'text-red-500',
            )}>
              {dummyReport.summary.recommendation.action === 'approve' ? 'Recommended for Approval' : 'Requires Human Review'}
            </span>
            <div className="flex items-center gap-2">
              <button className="p-2 text-zinc-600 hover:text-emerald-500 transition-colors">
                <CheckCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Content Gallery */}
        <div className="w-[58%] border-r border-zinc-900 flex flex-col overflow-hidden">
          {/* Filter nav */}
          <nav className="px-8 py-4 border-b border-zinc-900 shrink-0">
            <div className="flex items-center gap-8 text-sm">
              {(['all', 'flagged', 'instagram', 'youtube', 'tiktok'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'transition-colors capitalize pb-1',
                    filter === f
                      ? 'text-zinc-200 border-b border-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </nav>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-3 gap-4">
              {filteredFindings.map((finding) => {
                const PlatformIcon = platformIcons[finding.platform];
                const isFlagged = finding.severity === 'critical' || finding.severity === 'high';
                const isSelected = selectedPost?.id === finding.id;

                return (
                  <button
                    key={finding.id}
                    onClick={() => setSelectedPost(finding)}
                    className={cn(
                      'aspect-square relative bg-zinc-900 transition-all',
                      isSelected && 'ring-1 ring-zinc-600',
                      isFlagged && 'ring-1 ring-red-900/50'
                    )}
                  >
                    {/* Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlatformIcon className="w-8 h-8 text-zinc-800" />
                    </div>

                    {/* Severity line */}
                    <div className={cn(
                      'absolute bottom-0 left-0 right-0 h-0.5',
                      finding.severity === 'critical' && 'bg-red-500',
                      finding.severity === 'high' && 'bg-orange-500',
                      finding.severity === 'medium' && 'bg-amber-500',
                      finding.severity === 'low' && 'bg-zinc-700',
                    )} />

                    {/* Platform */}
                    <div className="absolute top-3 left-3">
                      <PlatformIcon className="w-4 h-4 text-zinc-600" />
                    </div>

                    {/* Hover title */}
                    <div className="absolute inset-0 bg-zinc-950/90 opacity-0 hover:opacity-100 transition-opacity p-4 flex items-end">
                      <p className="text-sm text-zinc-300 leading-snug line-clamp-3">{finding.title}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Context Panel */}
        <div className="w-[42%] overflow-y-auto">
          {selectedPost ? (
            <article className="p-8">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-sm text-zinc-600 hover:text-zinc-400 mb-8 transition-colors"
              >
                ← Return to overview
              </button>

              {/* Article Header */}
              <header className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  {(() => {
                    const Icon = platformIcons[selectedPost.platform];
                    return <Icon className="w-4 h-4 text-zinc-600" />;
                  })()}
                  <span className="text-zinc-600 text-sm">{selectedPost.source.date}</span>
                  <span className={cn(
                    'text-xs uppercase tracking-wider',
                    selectedPost.severity === 'critical' && 'text-red-500',
                    selectedPost.severity === 'high' && 'text-orange-500',
                    selectedPost.severity === 'medium' && 'text-amber-500',
                    selectedPost.severity === 'low' && 'text-zinc-600',
                  )}>
                    {selectedPost.severity}
                  </span>
                </div>
                <h2 className="text-xl font-serif text-zinc-100 leading-snug">{selectedPost.title}</h2>
              </header>

              {/* Summary */}
              <p className="text-zinc-400 leading-relaxed mb-8">{selectedPost.summary}</p>

              {/* Engagement */}
              {selectedPost.engagement && (
                <div className="flex items-center gap-6 text-sm text-zinc-600 mb-8 pb-8 border-b border-zinc-900">
                  {selectedPost.engagement.views && (
                    <span>{formatEngagement(selectedPost.engagement.views)} views</span>
                  )}
                  {selectedPost.engagement.likes && (
                    <span>{formatEngagement(selectedPost.engagement.likes)} likes</span>
                  )}
                  {selectedPost.engagement.comments && (
                    <span>{formatEngagement(selectedPost.engagement.comments)} comments</span>
                  )}
                </div>
              )}

              {/* Caption */}
              {selectedPost.postContent?.caption && (
                <section className="mb-8">
                  <h3 className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-4">Caption</h3>
                  <blockquote className="text-zinc-300 leading-relaxed pl-4 border-l-2 border-zinc-800">
                    <HighlightedText
                      text={selectedPost.postContent.caption}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </blockquote>
                </section>
              )}

              {/* Transcript */}
              {selectedPost.postContent?.transcript && (
                <section className="mb-8">
                  <h3 className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-4">Transcript</h3>
                  <blockquote className="text-zinc-300 leading-relaxed pl-4 border-l-2 border-zinc-800">
                    <HighlightedText
                      text={selectedPost.postContent.transcript}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </blockquote>
                </section>
              )}

              {/* Source */}
              <a
                href={selectedPost.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                View original content
                <ExternalLink className="w-4 h-4" />
              </a>
            </article>
          ) : (
            <article className="p-8">
              {/* Summary Article */}
              <header className="mb-8 pb-8 border-b border-zinc-900">
                <p className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-4">Assessment</p>
                <h2 className={cn(
                  'text-3xl font-serif mb-4',
                  dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-400',
                  dummyReport.summary.recommendation.action === 'review' && 'text-amber-400',
                  dummyReport.summary.recommendation.action === 'reject' && 'text-red-400',
                )}>
                  {dummyReport.summary.recommendation.action === 'approve' ? 'Cleared' : 'Review Required'}
                </h2>
                <p className="text-zinc-400 leading-relaxed text-lg">
                  {dummyReport.summary.recommendation.rationale}
                </p>
              </header>

              {/* Key Points */}
              <section className="mb-8 pb-8 border-b border-zinc-900">
                <h3 className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-6">Key Findings</h3>
                <ul className="space-y-4">
                  {dummyReport.summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-zinc-400 leading-relaxed pl-4 border-l border-zinc-800">
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Risk Breakdown */}
              <section className="mb-8 pb-8 border-b border-zinc-900">
                <h3 className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-6">Risk Distribution</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Critical', count: dummyReport.stats.critical, color: 'text-red-400' },
                    { label: 'High', count: dummyReport.stats.high, color: 'text-orange-400' },
                    { label: 'Medium', count: dummyReport.stats.medium, color: 'text-amber-400' },
                    { label: 'Low', count: dummyReport.stats.low, color: 'text-zinc-500' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className={cn('text-2xl font-serif', stat.color)}>{stat.count}</div>
                      <div className="text-xs text-zinc-600 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* External Coverage */}
              <section>
                <h3 className="text-xs text-zinc-600 tracking-[0.2em] uppercase mb-6">External Coverage</h3>
                <div className="space-y-4">
                  {webFindings.map((finding) => (
                    <div key={finding.id} className="pb-4 border-b border-zinc-900 last:border-0">
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          'w-1 h-1 rounded-full mt-2 shrink-0',
                          finding.severity === 'critical' && 'bg-red-500',
                          finding.severity === 'high' && 'bg-orange-500',
                          finding.severity === 'medium' && 'bg-amber-500',
                          finding.severity === 'low' && 'bg-zinc-600',
                        )} />
                        <div>
                          <p className="text-zinc-300 leading-snug">{finding.title}</p>
                          <p className="text-sm text-zinc-600 mt-1">{finding.source.title} · {finding.source.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
