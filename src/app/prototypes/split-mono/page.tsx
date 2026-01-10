'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Instagram, Youtube, Music2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dummyReport, type Finding, type Platform, formatEngagement } from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';

// Mock batch data
const mockCreators = [
  { id: '1', name: 'mrbeast', verdict: 'REVIEW', risk: 'CRIT', flags: 20 },
  { id: '2', name: 'emma_chamberlain', verdict: 'PASS', risk: 'LOW', flags: 2 },
  { id: '3', name: 'logan_paul', verdict: 'PASS', risk: 'LOW', flags: 3 },
  { id: '4', name: 'charli_damelio', verdict: 'REVIEW', risk: 'MED', flags: 5 },
  { id: '5', name: 'ksi', verdict: 'REVIEW', risk: 'HIGH', flags: 11 },
];

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

const platformShort: Record<Platform, string> = {
  instagram: 'IG',
  youtube: 'YT',
  tiktok: 'TT',
  web: 'WEB',
};

type ViewMode = 'list' | 'split';
type Filter = 'all' | 'flagged' | Platform;

export default function SplitMonoPrototype() {
  const [view, setView] = useState<ViewMode>('list');
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Finding | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');

  const socialFindings = dummyReport.findings.filter(f => f.platform !== 'web');
  const webFindings = dummyReport.findings.filter(f => f.platform === 'web');

  const filteredFindings = socialFindings.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return f.severity === 'critical' || f.severity === 'high';
    return f.platform === filter;
  });

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (view !== 'split') return;

      if (e.key === 'Escape') {
        if (selectedPost) {
          setSelectedPost(null);
        } else {
          setView('list');
        }
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredFindings.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        setSelectedPost(filteredFindings[selectedIndex] || null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedPost, selectedIndex, filteredFindings]);

  const handleCreatorClick = (id: string) => {
    setSelectedCreator(id);
    setView('split');
    setSelectedPost(null);
    setSelectedIndex(0);
  };

  // List View - Terminal Style
  if (view === 'list') {
    return (
      <div className="min-h-screen bg-zinc-950 font-mono">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Link
            href="/prototypes"
            className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-400 mb-8 text-xs"
          >
            <ArrowLeft className="w-3 h-3" />
            ../prototypes
          </Link>

          <div className="mb-8">
            <div className="text-zinc-600 text-xs mb-1"># campaign/q1-2025</div>
            <h1 className="text-zinc-200 text-sm">Creator Vetting Report</h1>
          </div>

          {/* Table */}
          <div className="border border-zinc-800 rounded">
            {/* Header */}
            <div className="grid grid-cols-[80px_1fr_80px_60px_60px] gap-2 px-4 py-2 bg-zinc-900 text-xs text-zinc-500 border-b border-zinc-800">
              <span>STATUS</span>
              <span>HANDLE</span>
              <span className="text-right">RISK</span>
              <span className="text-right">FLAGS</span>
              <span />
            </div>

            {/* Rows */}
            {mockCreators.map((creator, i) => (
              <button
                key={creator.id}
                onClick={() => handleCreatorClick(creator.id)}
                className={cn(
                  'w-full grid grid-cols-[80px_1fr_80px_60px_60px] gap-2 px-4 py-2 text-xs hover:bg-zinc-900/50 transition-colors items-center',
                  i < mockCreators.length - 1 && 'border-b border-zinc-900'
                )}
              >
                <span className={cn(
                  creator.verdict === 'PASS' && 'text-emerald-500',
                  creator.verdict === 'REVIEW' && 'text-amber-500',
                )}>
                  [{creator.verdict}]
                </span>
                <span className="text-zinc-300 text-left">@{creator.name}</span>
                <span className={cn(
                  'text-right',
                  creator.risk === 'CRIT' && 'text-red-500',
                  creator.risk === 'HIGH' && 'text-orange-500',
                  creator.risk === 'MED' && 'text-amber-500',
                  creator.risk === 'LOW' && 'text-zinc-600',
                )}>
                  {creator.risk}
                </span>
                <span className="text-right text-zinc-500 tabular-nums">{creator.flags}</span>
                <span className="text-right text-zinc-700">&gt;</span>
              </button>
            ))}
          </div>

          {/* Keyboard hints */}
          <div className="mt-6 text-xs text-zinc-700">
            <span className="text-zinc-600">[enter]</span> select
          </div>
        </div>
      </div>
    );
  }

  // Split View - Terminal
  return (
    <div className="h-screen bg-zinc-950 font-mono flex flex-col overflow-hidden">
      {/* Header bar */}
      <header className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setView('list')}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            [esc] back
          </button>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">@{dummyReport.creator.name.toLowerCase().replace(' ', '_')}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className={cn(
            dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-500',
            dummyReport.summary.recommendation.action === 'review' && 'text-amber-500',
            dummyReport.summary.recommendation.action === 'reject' && 'text-red-500',
          )}>
            [{dummyReport.summary.recommendation.action.toUpperCase()}]
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-600">[a] approve</span>
          <span className="text-zinc-600">[f] flag</span>
        </div>
      </header>

      {/* Main split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Content list */}
        <div className="w-[55%] border-r border-zinc-800 flex flex-col overflow-hidden">
          {/* Filter tabs */}
          <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 text-xs shrink-0">
            {(['all', 'flagged', 'instagram', 'youtube', 'tiktok'] as Filter[]).map((f, i) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 py-1 transition-colors',
                  filter === f
                    ? 'text-zinc-200 bg-zinc-800'
                    : 'text-zinc-600 hover:text-zinc-400'
                )}
              >
                [{i + 1}] {f}
              </button>
            ))}
            <span className="ml-auto text-zinc-700">{filteredFindings.length} items</span>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filteredFindings.map((finding, i) => {
              const isSelected = i === selectedIndex;
              const isFlagged = finding.severity === 'critical' || finding.severity === 'high';

              return (
                <button
                  key={finding.id}
                  onClick={() => {
                    setSelectedIndex(i);
                    setSelectedPost(finding);
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-xs transition-colors border-b border-zinc-900',
                    isSelected && 'bg-zinc-900',
                    !isSelected && 'hover:bg-zinc-900/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Index */}
                    <span className="text-zinc-700 tabular-nums w-6">
                      {String(i).padStart(2, '0')}
                    </span>

                    {/* Severity */}
                    <span className={cn(
                      'w-12 shrink-0',
                      finding.severity === 'critical' && 'text-red-500',
                      finding.severity === 'high' && 'text-orange-500',
                      finding.severity === 'medium' && 'text-amber-500',
                      finding.severity === 'low' && 'text-zinc-600',
                    )}>
                      [{finding.severity.slice(0, 4).toUpperCase()}]
                    </span>

                    {/* Platform */}
                    <span className="text-zinc-600 w-8 shrink-0">
                      {platformShort[finding.platform]}
                    </span>

                    {/* Title */}
                    <span className={cn(
                      'flex-1 truncate',
                      isFlagged ? 'text-zinc-200' : 'text-zinc-400'
                    )}>
                      {finding.title}
                    </span>

                    {/* Date */}
                    <span className="text-zinc-700 shrink-0">
                      {finding.source.date.slice(5)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation hints */}
          <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-700 shrink-0">
            <span className="text-zinc-600">[j/k]</span> navigate{' '}
            <span className="text-zinc-600">[enter]</span> select{' '}
            <span className="text-zinc-600">[esc]</span> back
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="w-[45%] overflow-y-auto text-xs">
          {selectedPost ? (
            <div className="p-4 space-y-4">
              <button
                onClick={() => setSelectedPost(null)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                [esc] summary
              </button>

              {/* Header */}
              <div className="border border-zinc-800 rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    selectedPost.severity === 'critical' && 'text-red-500',
                    selectedPost.severity === 'high' && 'text-orange-500',
                    selectedPost.severity === 'medium' && 'text-amber-500',
                    selectedPost.severity === 'low' && 'text-zinc-600',
                  )}>
                    [{selectedPost.severity.toUpperCase()}]
                  </span>
                  <span className="text-zinc-600">{platformShort[selectedPost.platform]}</span>
                  <span className="text-zinc-700">{selectedPost.source.date}</span>
                </div>
                <h2 className="text-zinc-200 leading-snug">{selectedPost.title}</h2>
              </div>

              {/* Summary */}
              <div className="space-y-1">
                <span className="text-zinc-600"># summary</span>
                <p className="text-zinc-400 leading-relaxed">{selectedPost.summary}</p>
              </div>

              {/* Engagement */}
              {selectedPost.engagement && (
                <div className="flex items-center gap-4 text-zinc-600">
                  {selectedPost.engagement.views && (
                    <span>views: {formatEngagement(selectedPost.engagement.views)}</span>
                  )}
                  {selectedPost.engagement.likes && (
                    <span>likes: {formatEngagement(selectedPost.engagement.likes)}</span>
                  )}
                  {selectedPost.engagement.comments && (
                    <span>comments: {formatEngagement(selectedPost.engagement.comments)}</span>
                  )}
                </div>
              )}

              {/* Caption */}
              {selectedPost.postContent?.caption && (
                <div className="space-y-1">
                  <span className="text-zinc-600"># caption</span>
                  <div className="text-zinc-300 leading-relaxed bg-zinc-900 p-3 rounded border border-zinc-800">
                    <HighlightedText
                      text={selectedPost.postContent.caption}
                      highlights={selectedPost.postContent.flaggedSpans}
                    />
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedPost.postContent?.transcript && (
                <div className="space-y-1">
                  <span className="text-zinc-600"># transcript</span>
                  <div className="text-zinc-300 leading-relaxed bg-zinc-900 p-3 rounded border border-zinc-800 max-h-48 overflow-y-auto">
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
                className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {selectedPost.source.title} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Verdict */}
              <div className="border border-zinc-800 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-sm',
                    dummyReport.summary.recommendation.action === 'approve' && 'text-emerald-500',
                    dummyReport.summary.recommendation.action === 'review' && 'text-amber-500',
                    dummyReport.summary.recommendation.action === 'reject' && 'text-red-500',
                  )}>
                    [{dummyReport.summary.recommendation.action.toUpperCase()}]
                  </span>
                  <span className={cn(
                    dummyReport.creator.riskLevel === 'CRITICAL' && 'text-red-500',
                    dummyReport.creator.riskLevel === 'HIGH' && 'text-orange-500',
                    dummyReport.creator.riskLevel === 'MEDIUM' && 'text-amber-500',
                    dummyReport.creator.riskLevel === 'LOW' && 'text-zinc-600',
                  )}>
                    risk: {dummyReport.creator.riskLevel}
                  </span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  {dummyReport.summary.recommendation.rationale}
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-1">
                <span className="text-zinc-600"># breakdown</span>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                    <div className="text-red-500">{dummyReport.stats.critical}</div>
                    <div className="text-zinc-700">crit</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                    <div className="text-orange-500">{dummyReport.stats.high}</div>
                    <div className="text-zinc-700">high</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                    <div className="text-amber-500">{dummyReport.stats.medium}</div>
                    <div className="text-zinc-700">med</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-center">
                    <div className="text-zinc-500">{dummyReport.stats.low}</div>
                    <div className="text-zinc-700">low</div>
                  </div>
                </div>
              </div>

              {/* Key points */}
              <div className="space-y-1">
                <span className="text-zinc-600"># key_findings</span>
                <ul className="space-y-2">
                  {dummyReport.summary.keyPoints.map((point, i) => (
                    <li key={i} className="text-zinc-400 leading-relaxed">
                      <span className="text-zinc-700">{i + 1}.</span> {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Web findings */}
              <div className="space-y-1">
                <span className="text-zinc-600"># web_findings ({webFindings.length})</span>
                <div className="space-y-1">
                  {webFindings.map((finding, i) => (
                    <div key={finding.id} className="flex items-start gap-2 text-zinc-400">
                      <span className={cn(
                        'shrink-0',
                        finding.severity === 'critical' && 'text-red-500',
                        finding.severity === 'high' && 'text-orange-500',
                        finding.severity === 'medium' && 'text-amber-500',
                        finding.severity === 'low' && 'text-zinc-600',
                      )}>
                        [{finding.severity.slice(0, 4).toUpperCase()}]
                      </span>
                      <span className="truncate">{finding.title}</span>
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
