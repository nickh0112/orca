'use client';

import { useState } from 'react';
import {
  ExternalLink,
  Instagram,
  Youtube,
  Music2,
  Globe,
  Heart,
  MessageCircle,
  Eye,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  dummyReport,
  groupFindingsByPlatform,
  sortBySeverity,
  formatEngagement,
  getCategoryLabel,
  type Finding,
  type Platform
} from '@/lib/dummy-report-data';
import { HighlightedText } from '@/components/prototypes/highlighted-text';
import { RiskMeter } from '@/components/prototypes/risk-meter';

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

export default function NewspaperPrototype() {
  const [expandedSection, setExpandedSection] = useState<string | null>('instagram');
  const groupedFindings = groupFindingsByPlatform();

  const getVerdictText = () => {
    switch (dummyReport.summary.recommendation.action) {
      case 'approve': return 'CLEARED FOR PARTNERSHIP';
      case 'caution': return 'PROCEED WITH CAUTION';
      case 'review': return 'REQUIRES FURTHER REVIEW';
      case 'reject': return 'NOT RECOMMENDED';
    }
  };

  const getVerdictColor = () => {
    switch (dummyReport.summary.recommendation.action) {
      case 'approve': return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'caution': return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      case 'review': return 'text-orange-400 border-orange-500/50 bg-orange-500/10';
      case 'reject': return 'text-red-400 border-red-500/50 bg-red-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-4xl mx-auto px-8 py-16 relative">
        {/* Masthead */}
        <header className="text-center mb-16 border-b-2 border-zinc-800 pb-12">
          <div className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase mb-6">
            Creator Intelligence Report • Confidential
          </div>

          {/* Creator Name - Editorial Typography */}
          <h1 className="text-7xl font-extralight tracking-[0.15em] text-zinc-100 uppercase mb-4">
            {dummyReport.creator.name.split('').map((char, i) => (
              <span key={i} className={char === ' ' ? 'mx-4' : ''}>{char}</span>
            ))}
          </h1>

          <div className="flex items-center justify-center gap-6 text-xs text-zinc-500">
            <span>Risk Assessment</span>
            <span className="text-zinc-700">•</span>
            <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <span className="text-zinc-700">•</span>
            <span>{dummyReport.stats.total} Findings</span>
          </div>
        </header>

        {/* Verdict Box */}
        <div className={cn(
          'border-2 p-8 mb-16 text-center',
          getVerdictColor()
        )}>
          <div className="text-[10px] tracking-[0.3em] uppercase mb-3 opacity-70">Final Verdict</div>
          <div className="text-3xl font-light tracking-[0.2em] uppercase mb-4">
            {getVerdictText()}
          </div>
          <p className="text-sm opacity-80 max-w-xl mx-auto leading-relaxed">
            {dummyReport.summary.recommendation.rationale}
          </p>
        </div>

        {/* Executive Summary */}
        <section className="mb-16">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-8">
              <p className="text-xl text-zinc-300 leading-relaxed first-letter:text-6xl first-letter:font-light first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-zinc-100">
                {dummyReport.summary.executiveSummary}
              </p>
            </div>
            <div className="col-span-4 border-l border-zinc-800 pl-8">
              <div className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-6">Risk Indicators</div>
              <div className="space-y-4">
                <RiskMeter label="Legal" score={dummyReport.summary.categoryScores.legal} variant="dots" />
                <RiskMeter label="Brand Safety" score={dummyReport.summary.categoryScores.brandSafety} variant="dots" />
                <RiskMeter label="Content" score={dummyReport.summary.categoryScores.content} variant="dots" />
                <RiskMeter label="Political" score={dummyReport.summary.categoryScores.political} variant="dots" />
              </div>
            </div>
          </div>
        </section>

        {/* Key Concerns - Pull Quote Style */}
        <section className="mb-16 border-y border-zinc-800 py-12">
          <div className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase mb-8 text-center">
            Key Concerns Identified
          </div>
          <ul className="space-y-4 max-w-2xl mx-auto">
            {dummyReport.summary.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="text-2xl font-light text-zinc-700">{i + 1}.</span>
                <span className="text-lg text-zinc-300 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section Divider */}
        <div className="flex items-center gap-4 mb-12">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] tracking-[0.5em] text-zinc-600 uppercase">The Evidence</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        {/* Platform Sections */}
        {(Object.keys(groupedFindings) as Platform[]).map((platform) => {
          const findings = sortBySeverity(groupedFindings[platform]);
          if (findings.length === 0) return null;

          const Icon = platformIcons[platform];
          const isExpanded = expandedSection === platform;

          return (
            <section key={platform} className="mb-12">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : platform)}
                className="w-full flex items-center justify-between group mb-6"
              >
                <div className="flex items-center gap-4">
                  <Icon className="w-5 h-5 text-zinc-600" />
                  <h2 className="text-2xl font-light tracking-wide text-zinc-200 capitalize">
                    {platform}
                  </h2>
                  <span className="text-sm text-zinc-600">
                    {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
                  </span>
                </div>
                <ChevronDown className={cn(
                  'w-5 h-5 text-zinc-600 transition-transform',
                  isExpanded && 'rotate-180'
                )} />
              </button>

              {isExpanded && (
                <div className="space-y-8">
                  {findings.map((finding, index) => (
                    <FindingArticle key={finding.id} finding={finding} index={index} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FindingArticle({ finding, index }: { finding: Finding; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index < 2);

  const severityLabel = {
    critical: 'CRITICAL CONCERN',
    high: 'HIGH RISK',
    medium: 'MODERATE RISK',
    low: 'LOW RISK',
  };

  const severityColor = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-green-400',
  };

  return (
    <article className="border-l-2 border-zinc-800 pl-8 hover:border-zinc-600 transition-colors">
      {/* Article Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className={cn('text-[10px] tracking-[0.2em] uppercase', severityColor[finding.severity])}>
            {severityLabel[finding.severity]}
          </span>
          <h3 className="text-xl text-zinc-100 mt-1 font-light">
            {finding.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
            <span>{finding.source.date}</span>
            <span>•</span>
            <span>{getCategoryLabel(finding.category)}</span>
            {finding.isUncertain && (
              <>
                <span>•</span>
                <span className="text-yellow-400">Requires Verification</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="text-zinc-400 leading-relaxed mb-4">
        {finding.summary}
      </p>

      {/* Post Content - The Evidence */}
      {finding.postContent && isExpanded && (
        <div className="bg-zinc-900/30 border border-zinc-800 p-6 my-6">
          {finding.postContent.caption && (
            <div className="mb-6">
              <div className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mb-3">
                Original Caption
              </div>
              <blockquote className="text-lg text-zinc-300 italic border-l-2 border-zinc-700 pl-4">
                <HighlightedText
                  text={`"${finding.postContent.caption}"`}
                  highlights={finding.postContent.flaggedSpans}
                />
              </blockquote>
            </div>
          )}

          {finding.postContent.transcript && (
            <div>
              <div className="text-[10px] tracking-[0.2em] text-zinc-500 uppercase mb-3">
                Transcript
              </div>
              <div className="text-zinc-400 leading-relaxed">
                <HighlightedText
                  text={finding.postContent.transcript}
                  highlights={finding.postContent.flaggedSpans}
                  showReasons={true}
                />
              </div>
            </div>
          )}

          {/* Engagement Stats */}
          {finding.engagement && (
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-zinc-800 text-sm text-zinc-500">
              {finding.engagement.likes && (
                <span className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-red-400/50" />
                  {formatEngagement(finding.engagement.likes)}
                </span>
              )}
              {finding.engagement.comments && (
                <span className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-blue-400/50" />
                  {formatEngagement(finding.engagement.comments)}
                </span>
              )}
              {finding.engagement.views && (
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-purple-400/50" />
                  {formatEngagement(finding.engagement.views)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Uncertainty Note */}
      {finding.isUncertain && finding.uncertainReason && isExpanded && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 my-4 text-sm text-yellow-400/80 italic">
          Editor&apos;s Note: {finding.uncertainReason}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        {finding.postContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isExpanded ? 'Collapse' : 'View Full Content →'}
          </button>
        )}
        <a
          href={finding.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          View Source <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
}
