'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Instagram,
  Youtube,
  Music2,
  Globe,
  Check,
  Flag,
  Eye,
  X,
  ChevronRight,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dummyReport,
  sortBySeverity,
  formatEngagement,
  type Finding,
  type Platform
} from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';
import { SeverityBadge, RiskLevelBadge } from '@/components/prototypes/severity-badge';

type ReviewStatus = 'pending' | 'approved' | 'flagged';

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

export default function KanbanPrototype() {
  const [findingStatuses, setFindingStatuses] = useState<Record<string, ReviewStatus>>(() => {
    const initial: Record<string, ReviewStatus> = {};
    dummyReport.findings.forEach(f => {
      initial[f.id] = 'pending';
    });
    return initial;
  });
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [draggedFinding, setDraggedFinding] = useState<string | null>(null);

  const getColumnFindings = (status: ReviewStatus) => {
    return sortBySeverity(
      dummyReport.findings.filter(f => findingStatuses[f.id] === status)
    );
  };

  const moveFinding = (findingId: string, newStatus: ReviewStatus) => {
    setFindingStatuses(prev => ({
      ...prev,
      [findingId]: newStatus
    }));
  };

  const columns: { status: ReviewStatus; title: string; color: string; bgColor: string }[] = [
    { status: 'pending', title: 'Needs Review', color: 'text-zinc-400', bgColor: 'bg-zinc-900/50' },
    { status: 'approved', title: 'Approved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/5' },
    { status: 'flagged', title: 'Flagged', color: 'text-red-400', bgColor: 'bg-red-500/5' },
  ];

  const pendingCount = getColumnFindings('pending').length;
  const approvedCount = getColumnFindings('approved').length;
  const flaggedCount = getColumnFindings('flagged').length;

  const progress = ((approvedCount + flaggedCount) / dummyReport.findings.length) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Main Board */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-zinc-800 bg-zinc-900/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-zinc-100">
                {dummyReport.creator.name}
              </h1>
              <RiskLevelBadge level={dummyReport.creator.riskLevel} size="sm" />
            </div>

            {/* Progress */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-zinc-400">
                <span className="text-zinc-200 font-medium">{approvedCount + flaggedCount}</span>
                <span> / {dummyReport.findings.length} reviewed</span>
              </div>
              <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <button
                disabled={pendingCount > 0}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  pendingCount === 0
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                )}
              >
                Complete Review
              </button>
            </div>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 p-6 flex gap-4 overflow-x-auto">
          {columns.map((column) => {
            const findings = getColumnFindings(column.status);

            return (
              <div
                key={column.status}
                className={cn(
                  'flex-1 min-w-[340px] max-w-[400px] rounded-xl border border-zinc-800 flex flex-col',
                  column.bgColor
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-zinc-600');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-zinc-600');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-zinc-600');
                  if (draggedFinding) {
                    moveFinding(draggedFinding, column.status);
                    setDraggedFinding(null);
                  }
                }}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {column.status === 'approved' && <Check className="w-4 h-4 text-emerald-400" />}
                      {column.status === 'flagged' && <Flag className="w-4 h-4 text-red-400" />}
                      {column.status === 'pending' && <Eye className="w-4 h-4 text-zinc-400" />}
                      <span className={cn('font-medium', column.color)}>{column.title}</span>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      column.status === 'pending' && 'bg-zinc-800 text-zinc-400',
                      column.status === 'approved' && 'bg-emerald-500/20 text-emerald-400',
                      column.status === 'flagged' && 'bg-red-500/20 text-red-400',
                    )}>
                      {findings.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {findings.map((finding) => (
                    <KanbanCard
                      key={finding.id}
                      finding={finding}
                      status={column.status}
                      isSelected={selectedFinding?.id === finding.id}
                      onSelect={() => setSelectedFinding(finding)}
                      onDragStart={() => setDraggedFinding(finding.id)}
                      onDragEnd={() => setDraggedFinding(null)}
                      onApprove={() => moveFinding(finding.id, 'approved')}
                      onFlag={() => moveFinding(finding.id, 'flagged')}
                      onReset={() => moveFinding(finding.id, 'pending')}
                    />
                  ))}

                  {findings.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
                      {column.status === 'approved' && 'No approved findings yet'}
                      {column.status === 'flagged' && 'No flagged findings yet'}
                      {column.status === 'pending' && 'All findings reviewed!'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedFinding && (
        <div className="w-[480px] border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-300">Finding Details</span>
            <button
              onClick={() => setSelectedFinding(null)}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <SeverityBadge severity={selectedFinding.severity} />
                {selectedFinding.isUncertain && (
                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                    Uncertain Match
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-zinc-100 mb-2">
                {selectedFinding.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {selectedFinding.summary}
              </p>
            </div>

            {/* Post Content */}
            {selectedFinding.postContent && (
              <div className="space-y-4">
                {selectedFinding.postContent.caption && (
                  <div className="bg-zinc-800/50 rounded-lg p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Caption</div>
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
                    <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Transcript</div>
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

            {/* Uncertainty Note */}
            {selectedFinding.isUncertain && selectedFinding.uncertainReason && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="text-xs text-yellow-400 font-medium mb-1">Verification Required</div>
                <div className="text-sm text-yellow-400/80">{selectedFinding.uncertainReason}</div>
              </div>
            )}

            {/* Engagement */}
            {selectedFinding.engagement && (
              <div className="bg-zinc-800/30 rounded-lg p-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Engagement</div>
                <div className="grid grid-cols-2 gap-3">
                  {selectedFinding.engagement.likes && (
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-lg font-bold text-zinc-200">{formatEngagement(selectedFinding.engagement.likes)}</div>
                      <div className="text-xs text-zinc-500">Likes</div>
                    </div>
                  )}
                  {selectedFinding.engagement.comments && (
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-lg font-bold text-zinc-200">{formatEngagement(selectedFinding.engagement.comments)}</div>
                      <div className="text-xs text-zinc-500">Comments</div>
                    </div>
                  )}
                  {selectedFinding.engagement.views && (
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-lg font-bold text-zinc-200">{formatEngagement(selectedFinding.engagement.views)}</div>
                      <div className="text-xs text-zinc-500">Views</div>
                    </div>
                  )}
                  {selectedFinding.engagement.shares && (
                    <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
                      <div className="text-lg font-bold text-zinc-200">{formatEngagement(selectedFinding.engagement.shares)}</div>
                      <div className="text-xs text-zinc-500">Shares</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Source */}
            <a
              href={selectedFinding.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors group"
            >
              <div>
                <div className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100">
                  {selectedFinding.source.title}
                </div>
                <div className="text-xs text-zinc-500">{selectedFinding.source.date}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300" />
            </a>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-zinc-800 flex gap-3">
            <button
              onClick={() => {
                moveFinding(selectedFinding.id, 'approved');
                setSelectedFinding(null);
              }}
              className="flex-1 py-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium hover:bg-emerald-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => {
                moveFinding(selectedFinding.id, 'flagged');
                setSelectedFinding(null);
              }}
              className="flex-1 py-2.5 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Flag className="w-4 h-4" />
              Flag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface KanbanCardProps {
  finding: Finding;
  status: ReviewStatus;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onApprove: () => void;
  onFlag: () => void;
  onReset: () => void;
}

function KanbanCard({
  finding,
  status,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
  onApprove,
  onFlag,
  onReset,
}: KanbanCardProps) {
  const Icon = platformIcons[finding.platform];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all group',
        isSelected
          ? 'border-cyan-500 bg-cyan-500/10'
          : 'border-zinc-700/50 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <div className="pt-0.5 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-zinc-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn(
              'w-5 h-5 rounded flex items-center justify-center',
              finding.severity === 'critical' && 'bg-red-500/20 text-red-400',
              finding.severity === 'high' && 'bg-orange-500/20 text-orange-400',
              finding.severity === 'medium' && 'bg-yellow-500/20 text-yellow-400',
              finding.severity === 'low' && 'bg-green-500/20 text-green-400',
            )}>
              <span className="text-[10px] font-bold">
                {finding.severity[0].toUpperCase()}
              </span>
            </div>
            <Icon className="w-3.5 h-3.5 text-zinc-500" />
          </div>

          <h4 className="text-sm font-medium text-zinc-200 line-clamp-2 mb-1">
            {finding.title}
          </h4>

          {finding.postContent?.caption && (
            <p className="text-xs text-zinc-500 line-clamp-1 italic">
              &quot;{finding.postContent.caption}&quot;
            </p>
          )}
        </div>

        {/* Quick Action */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        </div>
      </div>

      {/* Quick actions on hover (for pending only) */}
      {status === 'pending' && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            className="flex-1 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onFlag(); }}
            className="flex-1 py-1.5 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
          >
            Flag
          </button>
        </div>
      )}

      {/* Reset action for reviewed items */}
      {status !== 'pending' && (
        <div className="mt-3 pt-3 border-t border-zinc-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onReset(); }}
            className="w-full py-1.5 text-xs bg-zinc-700/50 text-zinc-400 rounded hover:bg-zinc-700 transition-colors"
          >
            Move to Review
          </button>
        </div>
      )}
    </div>
  );
}
