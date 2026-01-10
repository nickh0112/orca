'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Instagram,
  Youtube,
  Music2,
  Globe,
  Zap,
  Shield,
  Eye,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dummyReport,
  groupFindingsByPlatform,
  sortBySeverity,
  formatEngagement,
  type Finding,
  type Platform
} from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';
import { SeverityBadge, RiskLevelBadge, PulsingDot } from '@/components/prototypes/severity-badge';
import { RiskRadar } from '@/components/prototypes/risk-meter';

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

const platformColors: Record<Platform, string> = {
  instagram: 'from-pink-500 to-purple-500',
  youtube: 'from-red-500 to-red-600',
  tiktok: 'from-cyan-400 to-pink-500',
  web: 'from-blue-500 to-indigo-500',
};

export default function CommandCenterPrototype() {
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  const groupedFindings = groupFindingsByPlatform();
  const criticalFindings = dummyReport.findings.filter(f => f.severity === 'critical' || f.severity === 'high');

  const platformFindings = sortBySeverity(
    showCriticalOnly
      ? groupedFindings[activePlatform].filter(f => f.severity === 'critical' || f.severity === 'high')
      : groupedFindings[activePlatform]
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-mono">
      {/* Scan lines overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Header - Mission Control Style */}
      <header className="border-b border-cyan-500/20 bg-zinc-950/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400" />
                <span className="text-cyan-400 font-bold tracking-[0.2em] text-sm uppercase">
                  ORCA COMMAND
                </span>
              </div>
              <div className="h-6 w-px bg-zinc-700" />
              <div className="text-zinc-500 text-xs">
                SUBJECT: <span className="text-zinc-200">{dummyReport.creator.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors rounded flex items-center gap-2">
                <Download className="w-3 h-3" />
                EXPORT
              </button>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                LIVE
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6">
        {/* Top Section - Threat Level & Radar */}
        <div className="grid grid-cols-12 gap-6 mb-6">
          {/* Threat Level Display */}
          <div className="col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
            <div className="relative">
              <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Threat Assessment</div>
              <div className="flex items-end gap-4 mb-4">
                <div className="text-6xl font-black text-red-500 leading-none tracking-tight">
                  {dummyReport.creator.riskScore}
                </div>
                <div className="text-zinc-500 text-sm mb-2">/ 100</div>
              </div>
              <RiskLevelBadge level={dummyReport.creator.riskLevel} size="lg" />
              <div className="mt-4 text-xs text-zinc-500">
                {dummyReport.stats.total} findings identified across {Object.keys(groupedFindings).length} platforms
              </div>
            </div>
          </div>

          {/* Risk Radar */}
          <div className="col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 flex flex-col items-center justify-center">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Risk Distribution</div>
            <RiskRadar scores={dummyReport.summary.categoryScores} size={180} />
          </div>

          {/* Quick Stats */}
          <div className="col-span-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Signal Analysis</div>
            <div className="space-y-3">
              {[
                { label: 'CRITICAL', value: dummyReport.stats.critical, color: 'text-red-500' },
                { label: 'HIGH', value: dummyReport.stats.high, color: 'text-orange-500' },
                { label: 'MEDIUM', value: dummyReport.stats.medium, color: 'text-yellow-500' },
                { label: 'LOW', value: dummyReport.stats.low, color: 'text-green-500' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{stat.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', stat.color.replace('text-', 'bg-'))}
                        style={{ width: `${(stat.value / dummyReport.stats.total) * 100}%` }}
                      />
                    </div>
                    <span className={cn('text-sm font-bold', stat.color)}>{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Critical Alerts Section */}
        <div className="bg-zinc-900/50 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <PulsingDot severity="critical" />
              <span className="text-xs text-red-400 uppercase tracking-widest font-bold">
                Critical Alerts
              </span>
            </div>
            <span className="text-xs text-zinc-500">({criticalFindings.length} items require immediate attention)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {criticalFindings.slice(0, 4).map((finding) => (
              <button
                key={finding.id}
                onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                className="flex items-start gap-3 p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-red-500/50 transition-all text-left group"
              >
                <SeverityBadge severity={finding.severity} size="sm" showLabel={false} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-200 font-medium line-clamp-1 group-hover:text-red-400 transition-colors">
                    {finding.title}
                  </div>
                  <div className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                    {finding.summary}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Platform Feeds Section */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          {/* Platform Tabs */}
          <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(Object.keys(groupedFindings) as Platform[]).map((platform) => {
                const Icon = platformIcons[platform];
                const count = groupedFindings[platform].length;
                const isActive = activePlatform === platform;

                return (
                  <button
                    key={platform}
                    onClick={() => setActivePlatform(platform)}
                    className={cn(
                      'px-4 py-2 rounded-lg text-xs uppercase tracking-wider flex items-center gap-2 transition-all',
                      isActive
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{platform}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px]',
                      isActive ? 'bg-zinc-700' : 'bg-zinc-800'
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              className={cn(
                'px-3 py-1.5 rounded text-xs flex items-center gap-2 transition-all border',
                showCriticalOnly
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
              )}
            >
              <Filter className="w-3 h-3" />
              Critical Only
            </button>
          </div>

          {/* Platform Content Feed */}
          <div className="p-4">
            <div className="space-y-3">
              {platformFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={cn(
                    'border rounded-lg transition-all',
                    expandedFinding === finding.id
                      ? 'border-cyan-500/50 bg-zinc-800/50'
                      : 'border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  <button
                    onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}
                    className="w-full p-4 flex items-start gap-4 text-left"
                  >
                    {/* Severity indicator */}
                    <div className={cn(
                      'w-1 self-stretch rounded-full shrink-0',
                      finding.severity === 'critical' && 'bg-red-500',
                      finding.severity === 'high' && 'bg-orange-500',
                      finding.severity === 'medium' && 'bg-yellow-500',
                      finding.severity === 'low' && 'bg-green-500',
                    )} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={finding.severity} size="sm" />
                        <span className="text-sm font-medium text-zinc-200">{finding.title}</span>
                        {finding.isUncertain && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                            UNCERTAIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{finding.summary}</p>

                      {/* Preview of post content */}
                      {finding.postContent?.caption && !expandedFinding && (
                        <div className="mt-2 text-xs text-zinc-600 line-clamp-1 italic">
                          &quot;{finding.postContent.caption}&quot;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {finding.engagement && (
                        <div className="text-xs text-zinc-500">
                          <Eye className="w-3 h-3 inline mr-1" />
                          {formatEngagement(finding.engagement.views || finding.engagement.likes || 0)}
                        </div>
                      )}
                      <span className="text-xs text-zinc-600">{finding.source.date}</span>
                      {expandedFinding === finding.id ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {expandedFinding === finding.id && (
                    <div className="px-4 pb-4 border-t border-zinc-700/50 pt-4 ml-5">
                      {finding.postContent && (
                        <div className="space-y-4">
                          {finding.postContent.caption && (
                            <div className="bg-zinc-900/50 rounded-lg p-4">
                              <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-2">Caption</div>
                              <div className="text-sm text-zinc-300">
                                <HighlightedText
                                  text={finding.postContent.caption}
                                  highlights={finding.postContent.flaggedSpans}
                                />
                              </div>
                            </div>
                          )}
                          {finding.postContent.transcript && (
                            <div className="bg-zinc-900/50 rounded-lg p-4">
                              <div className="text-[10px] text-cyan-400 uppercase tracking-widest mb-2">Transcript</div>
                              <div className="text-sm text-zinc-300">
                                <HighlightedText
                                  text={finding.postContent.transcript}
                                  highlights={finding.postContent.flaggedSpans}
                                  showReasons={true}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {finding.isUncertain && finding.uncertainReason && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="text-[10px] text-yellow-400 uppercase tracking-widest mb-1">Uncertainty Note</div>
                          <div className="text-xs text-yellow-400/80">{finding.uncertainReason}</div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between">
                        <a
                          href={finding.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          View Source <ExternalLink className="w-3 h-3" />
                        </a>
                        {finding.engagement && (
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            {finding.engagement.likes && <span>❤️ {formatEngagement(finding.engagement.likes)}</span>}
                            {finding.engagement.comments && <span>💬 {formatEngagement(finding.engagement.comments)}</span>}
                            {finding.engagement.views && <span>👁 {formatEngagement(finding.engagement.views)}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
