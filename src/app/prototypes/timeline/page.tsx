'use client';

import { useState, useMemo } from 'react';
import {
  Pin,
  ExternalLink,
  Instagram,
  Youtube,
  Music2,
  Globe,
  Link2,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  MessageSquare,
  StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dummyReport,
  sortBySeverity,
  formatEngagement,
  getCategoryLabel,
  type Finding,
  type Platform,
  type Severity,
  type Category
} from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';
import { SeverityBadge, RiskLevelBadge } from '@/components/prototypes/severity-badge';

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export default function TimelinePrototype() {
  const [pinnedFindings, setPinnedFindings] = useState<Set<string>>(new Set(['f1', 'f3']));
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [noteInputValue, setNoteInputValue] = useState('');

  // Group findings by month
  const timelineData = useMemo(() => {
    let filtered = dummyReport.findings;

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(f => f.severity === filterSeverity);
    }
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(f => f.platform === filterPlatform);
    }

    // Group by month
    const byMonth: Record<string, Finding[]> = {};
    filtered.forEach(finding => {
      const date = new Date(finding.source.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(finding);
    });

    // Sort months and findings within each month
    const sorted = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, findings]) => ({
        key,
        date: new Date(key.split('-')[0] + '-' + (parseInt(key.split('-')[1]) + 1).toString().padStart(2, '0') + '-01'),
        findings: sortBySeverity(findings),
      }));

    return sorted;
  }, [filterSeverity, filterPlatform]);

  const togglePin = (id: string) => {
    setPinnedFindings(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addNote = (findingId: string) => {
    if (noteInputValue.trim()) {
      setNotes(prev => ({ ...prev, [findingId]: noteInputValue.trim() }));
    }
    setShowNoteInput(null);
    setNoteInputValue('');
  };

  const pinnedItems = dummyReport.findings.filter(f => pinnedFindings.has(f.id));

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-500 font-bold tracking-wider text-sm uppercase">
                  Investigation
                </span>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <h1 className="text-xl font-semibold text-zinc-100">
                {dummyReport.creator.name}
              </h1>
              <RiskLevelBadge level={dummyReport.creator.riskLevel} size="sm" />
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors rounded flex items-center gap-2">
                <Download className="w-3 h-3" />
                Export Report
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Risk Score Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-800 rounded-xl p-6 mb-8 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Investigation Risk Score</div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-red-500">{dummyReport.creator.riskScore}</span>
              <span className="text-zinc-500">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Findings Analyzed</div>
            <div className="text-3xl font-bold text-zinc-200">{dummyReport.stats.total}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Critical Issues</div>
            <div className="text-3xl font-bold text-red-500">{dummyReport.stats.critical}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pinned Evidence</div>
            <div className="text-3xl font-bold text-amber-500">{pinnedItems.length}</div>
          </div>
        </div>

        {/* Pinned Evidence */}
        {pinnedItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Pin className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-500 uppercase tracking-wider">
                Pinned Evidence
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {pinnedItems.map(finding => (
                <PinnedCard
                  key={finding.id}
                  finding={finding}
                  onUnpin={() => togglePin(finding.id)}
                  onClick={() => setSelectedFinding(finding)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Filter:</span>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as Platform | 'all')}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="web">Web</option>
          </select>

          <div className="flex-1" />

          <span className="text-sm text-zinc-500">
            {timelineData.reduce((acc, m) => acc + m.findings.length, 0)} findings
          </span>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[100px] top-0 bottom-0 w-px bg-zinc-800" />

          {timelineData.map(({ key, date, findings }) => (
            <div key={key} className="relative mb-8">
              {/* Month marker */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-[100px] text-right">
                  <div className="text-xs text-zinc-500">{date.getFullYear()}</div>
                  <div className="text-lg font-bold text-zinc-300">{monthNames[date.getMonth()]}</div>
                </div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-600 relative z-10" />
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {/* Findings for this month */}
              <div className="ml-[116px] space-y-4">
                {findings.map(finding => (
                  <EvidenceCard
                    key={finding.id}
                    finding={finding}
                    isPinned={pinnedFindings.has(finding.id)}
                    note={notes[finding.id]}
                    onPin={() => togglePin(finding.id)}
                    onClick={() => setSelectedFinding(finding)}
                    onAddNote={() => setShowNoteInput(finding.id)}
                    connectedFindings={finding.connectedTo?.map(id =>
                      dummyReport.findings.find(f => f.id === id)?.title || ''
                    ).filter(Boolean)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel (Overlay) */}
      {selectedFinding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SeverityBadge severity={selectedFinding.severity} />
                <span className="text-sm text-zinc-400">{getCategoryLabel(selectedFinding.category)}</span>
              </div>
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-2">{selectedFinding.title}</h2>
                <p className="text-zinc-400">{selectedFinding.summary}</p>
              </div>

              {selectedFinding.postContent && (
                <div className="space-y-4">
                  {selectedFinding.postContent.caption && (
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <div className="text-xs text-amber-500 uppercase tracking-wider mb-2">Caption</div>
                      <div className="text-sm text-zinc-300">
                        <HighlightedText
                          text={selectedFinding.postContent.caption}
                          highlights={selectedFinding.postContent.flaggedSpans}
                        />
                      </div>
                    </div>
                  )}
                  {selectedFinding.postContent.transcript && (
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <div className="text-xs text-amber-500 uppercase tracking-wider mb-2">Transcript</div>
                      <div className="text-sm text-zinc-300">
                        <HighlightedText
                          text={selectedFinding.postContent.transcript}
                          highlights={selectedFinding.postContent.flaggedSpans}
                          showReasons={true}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedFinding.engagement && (
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  {selectedFinding.engagement.likes && <span>❤️ {formatEngagement(selectedFinding.engagement.likes)}</span>}
                  {selectedFinding.engagement.comments && <span>💬 {formatEngagement(selectedFinding.engagement.comments)}</span>}
                  {selectedFinding.engagement.views && <span>👁 {formatEngagement(selectedFinding.engagement.views)}</span>}
                </div>
              )}

              {/* Note input */}
              {showNoteInput === selectedFinding.id ? (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="text-xs text-amber-500 uppercase tracking-wider mb-2">Add Investigation Note</div>
                  <textarea
                    value={noteInputValue}
                    onChange={(e) => setNoteInputValue(e.target.value)}
                    placeholder="Add your notes here..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setShowNoteInput(null)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => addNote(selectedFinding.id)}
                      className="px-3 py-1.5 text-xs bg-amber-500 text-black rounded hover:bg-amber-400"
                    >
                      Save Note
                    </button>
                  </div>
                </div>
              ) : notes[selectedFinding.id] ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-xs text-amber-500 uppercase tracking-wider mb-2">
                    <StickyNote className="w-3 h-3" />
                    Investigation Note
                  </div>
                  <p className="text-sm text-amber-400/80">{notes[selectedFinding.id]}</p>
                </div>
              ) : null}
            </div>

            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
              <a
                href={selectedFinding.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                View Source <ExternalLink className="w-3 h-3" />
              </a>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNoteInput(selectedFinding.id)}
                  className="px-3 py-1.5 text-sm border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 rounded-lg flex items-center gap-2"
                >
                  <MessageSquare className="w-3 h-3" />
                  Add Note
                </button>
                <button
                  onClick={() => togglePin(selectedFinding.id)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-lg flex items-center gap-2',
                    pinnedFindings.has(selectedFinding.id)
                      ? 'bg-amber-500 text-black hover:bg-amber-400'
                      : 'border border-amber-500/50 text-amber-500 hover:bg-amber-500/10'
                  )}
                >
                  <Pin className="w-3 h-3" />
                  {pinnedFindings.has(selectedFinding.id) ? 'Pinned' : 'Pin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PinnedCardProps {
  finding: Finding;
  onUnpin: () => void;
  onClick: () => void;
}

function PinnedCard({ finding, onUnpin, onClick }: PinnedCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 cursor-pointer hover:border-amber-500/50 transition-colors group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Pin className="w-3 h-3 text-amber-500" />
          <span className="text-xs text-amber-500 uppercase tracking-wider">Pinned</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUnpin(); }}
          className="opacity-0 group-hover:opacity-100 text-xs text-zinc-500 hover:text-zinc-300 transition-all"
        >
          Unpin
        </button>
      </div>
      <h4 className="font-medium text-zinc-200 line-clamp-2 mb-1">{finding.title}</h4>
      <p className="text-xs text-zinc-500 line-clamp-2">{finding.summary}</p>
    </div>
  );
}

interface EvidenceCardProps {
  finding: Finding;
  isPinned: boolean;
  note?: string;
  onPin: () => void;
  onClick: () => void;
  onAddNote: () => void;
  connectedFindings?: string[];
}

function EvidenceCard({
  finding,
  isPinned,
  note,
  onPin,
  onClick,
  onAddNote,
  connectedFindings,
}: EvidenceCardProps) {
  const Icon = platformIcons[finding.platform];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-zinc-900/50 border rounded-lg overflow-hidden cursor-pointer transition-all group hover:border-zinc-600',
        isPinned ? 'border-amber-500/30' : 'border-zinc-800'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              finding.platform === 'instagram' && 'bg-pink-500/20 text-pink-400',
              finding.platform === 'youtube' && 'bg-red-500/20 text-red-400',
              finding.platform === 'tiktok' && 'bg-cyan-500/20 text-cyan-400',
              finding.platform === 'web' && 'bg-blue-500/20 text-blue-400',
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <SeverityBadge severity={finding.severity} size="sm" />
              <div className="text-xs text-zinc-500 mt-1">{finding.source.date}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onAddNote(); }}
              className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPin(); }}
              className={cn(
                'p-1.5 rounded transition-colors',
                isPinned
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'hover:bg-zinc-800 text-zinc-500 hover:text-amber-400'
              )}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Summary */}
        <h4 className="font-medium text-zinc-200 mb-2">{finding.title}</h4>
        <p className="text-sm text-zinc-500 line-clamp-2 mb-3">{finding.summary}</p>

        {/* Post Content Preview */}
        {finding.postContent?.caption && (
          <div className="bg-zinc-800/50 rounded-lg p-3 mb-3">
            <div className="text-xs text-zinc-600 mb-1">Caption:</div>
            <div className="text-sm text-zinc-400 line-clamp-2">
              <HighlightedText
                text={`"${finding.postContent.caption}"`}
                highlights={finding.postContent.flaggedSpans}
              />
            </div>
          </div>
        )}

        {/* Connected findings */}
        {connectedFindings && connectedFindings.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Link2 className="w-3 h-3" />
            <span>Connected to: {connectedFindings.join(', ')}</span>
          </div>
        )}

        {/* Note indicator */}
        {note && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-500">
            <StickyNote className="w-3 h-3" />
            <span className="line-clamp-1">{note}</span>
          </div>
        )}
      </div>

      {/* Source footer */}
      <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-800/20 flex items-center justify-between">
        <span className="text-xs text-zinc-600">{getCategoryLabel(finding.category)}</span>
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          {finding.source.title} <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
}
