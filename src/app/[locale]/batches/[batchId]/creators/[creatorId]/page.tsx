'use client';

import { useEffect, useState, useMemo, useCallback, use, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe, Download, Eye, Tag, AlertTriangle, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { cn, getPlatformFromUrl } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { generateCreatorPdf } from '@/components/report/creator-pdf';
import { VisualAnalysisPanel, VisualAnalysisSummary } from '@/components/report/visual-analysis-panel';
import { VideoTimeline } from '@/components/report/video-timeline';
import { VideoPlayer } from '@/components/report/video-player';
import { SafetyScoreBreakdown, SafetyScoreCompact } from '@/components/report/safety-score-breakdown';
import { BrandExposurePanel, BrandExposureSummary } from '@/components/report/brand-exposure-panel';
import { TranscriptPanel, TranscriptCompact } from '@/components/report/transcript-panel';
import { CompetitorAlert, CompetitorAlertCompact } from '@/components/report/competitor-alert';
import { SafetySummary, SafetyBadge } from '@/components/report/safety-summary';
import { EvidencePanel } from '@/components/report/evidence-panel';
import { FlagDigest } from '@/components/report/flag-digest';
import { PostsList } from '@/components/report/posts-list';
import type { Finding, RiskLevel, VisualAnalysisData } from '@/types';
import type { FlagEvidence, SafetyRationale } from '@/types/video-analysis';

type Platform = 'instagram' | 'youtube' | 'tiktok' | 'web';
type Filter = 'all' | 'flagged' | Platform;

interface Attachment {
  id: string;
  type: string;
  platform: string | null;
  data: unknown;
}

interface BrandPartnership {
  brandName: string;
  platform: string;
  postCount: number;
  isCompetitor?: boolean;
}

interface CreatorData {
  id: string;
  name: string;
  socialLinks: string[];
  status: string;
  batch: {
    id: string;
    name: string;
  };
  report: {
    id: string;
    riskLevel: RiskLevel;
    summary: string | null;
    findings: Finding[];
    searchQueries: string[];
    createdAt: string;
  } | null;
  attachments: Attachment[];
}

const platformIcons: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

function getPlatformFromFinding(finding: Finding): Platform {
  if (finding.socialMediaSource?.platform) {
    return finding.socialMediaSource.platform as Platform;
  }
  // Infer from source URL
  const url = finding.source.url.toLowerCase();
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  return 'web';
}

function isSocialPost(finding: Finding): boolean {
  return finding.type === 'social_post' || !!finding.socialMediaSource;
}

export default function CreatorReportPage({
  params,
}: {
  params: Promise<{ batchId: string; creatorId: string }>;
}) {
  const { batchId, creatorId } = use(params);
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [selectedFlagEvidence, setSelectedFlagEvidence] = useState<FlagEvidence | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [isSafetySummaryExpanded, setIsSafetySummaryExpanded] = useState(true);

  // Video playback synchronization state
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Seek request with unique ID to ensure seeking always works (even for same timestamp)
  const [seekRequest, setSeekRequest] = useState<{ time: number; id: number } | null>(null);
  const seekIdRef = useRef(0);

  // Handle seeking from timeline, transcript, or brand clicks
  const handleSeekToTime = useCallback((time: number) => {
    seekIdRef.current += 1;
    setSeekRequest({ time, id: seekIdRef.current });
  }, []);

  // Handle flag click from FlagDigest
  const handleFlagClick = useCallback((evidence: FlagEvidence) => {
    setSelectedFlagEvidence(evidence);
    handleSeekToTime(evidence.timestamp);
  }, [handleSeekToTime]);

  // Handle post selection from PostsList
  const handlePostSelect = useCallback((finding: Finding) => {
    setSelectedFinding(finding);
    setSelectedFlagEvidence(null);
    setCurrentVideoTime(0);
    setIsVideoPlaying(false);
  }, []);

  const t = useTranslations('creatorReport');
  const tRisk = useTranslations('risk');
  const tVerdict = useTranslations('verdict');
  const locale = useLocale();

  useEffect(() => {
    fetch(`/api/creators/${creatorId}`)
      .then((res) => res.json())
      .then((data) => {
        setCreator(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [creatorId]);

  // Parse brand partnerships from attachments
  const brandPartnerships = useMemo(() => {
    if (!creator?.attachments) return [];

    const brands: BrandPartnership[] = [];

    for (const att of creator.attachments) {
      if (att.type.startsWith('brands-') && att.data) {
        const data = att.data as { brands?: Array<{ brandName: string; postCount: number; isCompetitor?: boolean }> };
        if (data.brands) {
          for (const brand of data.brands) {
            brands.push({
              brandName: brand.brandName,
              platform: att.platform || 'unknown',
              postCount: brand.postCount,
              isCompetitor: brand.isCompetitor,
            });
          }
        }
      }
    }

    // Deduplicate by brand name, keeping the one with highest post count
    const brandMap = new Map<string, BrandPartnership>();
    for (const brand of brands) {
      const existing = brandMap.get(brand.brandName);
      if (!existing || brand.postCount > existing.postCount) {
        brandMap.set(brand.brandName, brand);
      }
    }

    return Array.from(brandMap.values()).sort((a, b) => b.postCount - a.postCount);
  }, [creator?.attachments]);

  // Extract competitor brand names for alerts
  const competitorBrandNames = useMemo(() => {
    return brandPartnerships
      .filter(b => b.isCompetitor)
      .map(b => b.brandName);
  }, [brandPartnerships]);

  // Aggregate logo detections across all social findings
  const aggregatedLogoDetections = useMemo(() => {
    const logoMap = new Map<string, { brand: string; appearances: Array<{ startTime: number; endTime: number; confidence: number; prominence?: 'primary' | 'secondary' | 'background' }>; totalDuration: number; likelySponsor: boolean }>();

    for (const finding of (creator?.report?.findings || [])) {
      const va = finding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
      if (!va?.logoDetections) continue;

      for (const logo of va.logoDetections) {
        const existing = logoMap.get(logo.brand);
        if (existing) {
          existing.appearances.push(...logo.appearances);
          existing.totalDuration += logo.totalDuration;
          existing.likelySponsor = existing.likelySponsor || logo.likelySponsor;
        } else {
          logoMap.set(logo.brand, { ...logo, appearances: [...logo.appearances] });
        }
      }
    }

    return Array.from(logoMap.values());
  }, [creator?.report?.findings]);

  // Split findings into social posts and web findings
  const { socialFindings, webFindings, filteredFindings, stats } = useMemo(() => {
    const findings = creator?.report?.findings || [];

    const social = findings.filter(isSocialPost);
    const web = findings.filter(f => !isSocialPost(f));

    const stats = {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
    };

    let filtered = social;
    if (filter === 'flagged') {
      filtered = social.filter(f => f.severity === 'critical' || f.severity === 'high');
    } else if (filter !== 'all') {
      filtered = social.filter(f => getPlatformFromFinding(f) === filter);
    }

    return { socialFindings: social, webFindings: web, filteredFindings: filtered, stats };
  }, [creator?.report?.findings, filter]);

  // Aggregate all flag evidence from all social findings
  const aggregatedEvidence = useMemo(() => {
    const allEvidence: FlagEvidence[] = [];

    for (const finding of socialFindings) {
      const va = finding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
      const safetyRationale = va?.safetyRationale as SafetyRationale | undefined;
      if (safetyRationale?.evidence) {
        allEvidence.push(...safetyRationale.evidence);
      }
    }

    return allEvidence;
  }, [socialFindings]);

  // Get the overall safety rating based on evidence
  const overallSafetyRating = useMemo(() => {
    const highCount = aggregatedEvidence.filter(e => e.severity === 'high').length;
    const medCount = aggregatedEvidence.filter(e => e.severity === 'medium').length;

    if (highCount > 0) return 'unsafe' as const;
    if (medCount > 0) return 'caution' as const;
    return 'safe' as const;
  }, [aggregatedEvidence]);

  // Get aggregated safety rationale summary
  const aggregatedSafetyRationale = useMemo((): SafetyRationale | undefined => {
    if (aggregatedEvidence.length === 0) return undefined;

    // Build summary from evidence
    const highCount = aggregatedEvidence.filter(e => e.severity === 'high').length;
    const medCount = aggregatedEvidence.filter(e => e.severity === 'medium').length;
    const lowCount = aggregatedEvidence.filter(e => e.severity === 'low').length;

    // Count by category
    const categoryCounts = aggregatedEvidence.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat]) => cat);

    const summary = highCount > 0
      ? `${highCount} high-severity ${topCategories[0] || 'safety'} ${highCount === 1 ? 'concern' : 'concerns'} detected across analyzed content.`
      : medCount > 0
      ? `${medCount} medium-severity concerns detected. Categories include ${topCategories.join(', ')}.`
      : `${lowCount} minor concerns detected. Content is generally brand-safe.`;

    // Aggregate coverage stats
    let totalDuration = 0;
    let totalWords = 0;
    let totalFrames = 0;

    for (const finding of socialFindings) {
      const va = finding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
      const safetyRationale = va?.safetyRationale as SafetyRationale | undefined;
      if (safetyRationale?.coverageStats) {
        totalDuration += safetyRationale.coverageStats.videoDuration || 0;
        totalWords += safetyRationale.coverageStats.transcriptWords || 0;
        totalFrames += safetyRationale.coverageStats.framesAnalyzed || 0;
      }
    }

    return {
      summary,
      evidence: aggregatedEvidence,
      categoryScores: {
        profanity: { score: 0, reason: '', evidenceCount: categoryCounts['profanity'] || 0 },
        violence: { score: 0, reason: '', evidenceCount: categoryCounts['violence'] || 0 },
        adult: { score: 0, reason: '', evidenceCount: categoryCounts['adult'] || 0 },
        substances: { score: 0, reason: '', evidenceCount: categoryCounts['substances'] || 0 },
        controversial: { score: 0, reason: '', evidenceCount: categoryCounts['controversial'] || 0 },
        dangerous: { score: 0, reason: '', evidenceCount: categoryCounts['dangerous'] || 0 },
        political: { score: 0, reason: '', evidenceCount: categoryCounts['political'] || 0 },
      },
      coverageStats: {
        videoDuration: totalDuration,
        transcriptWords: totalWords,
        framesAnalyzed: totalFrames,
      },
    };
  }, [aggregatedEvidence, socialFindings]);

  // Get evidence for the currently selected finding
  const selectedFindingEvidence = useMemo(() => {
    if (!selectedFinding) return [];
    const va = selectedFinding.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
    const safetyRationale = va?.safetyRationale as SafetyRationale | undefined;
    return safetyRationale?.evidence || [];
  }, [selectedFinding]);

  const handleExportPdf = async () => {
    if (!creator || !creator.report) return;

    setIsExporting(true);
    try {
      const blob = await generateCreatorPdf({
        creatorName: creator.name,
        batchName: creator.batch.name,
        socialLinks: creator.socialLinks || [],
        riskLevel: creator.report.riskLevel,
        summary: creator.report.summary,
        findings: creator.report.findings,
        generatedAt: new Date(),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creator.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Get recommendation action based on risk level
  const getRecommendation = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'CRITICAL':
      case 'HIGH':
        return { action: tVerdict('review'), color: 'text-red-500' };
      case 'MEDIUM':
        return { action: tVerdict('review'), color: 'text-amber-500' };
      case 'LOW':
        return { action: tVerdict('approve'), color: 'text-emerald-500' };
      default:
        return { action: tVerdict('review'), color: 'text-zinc-500' };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">{t('creatorNotFound')}</p>
          <Link
            href={`/${locale}/batches/${batchId}`}
            className="text-zinc-300 hover:text-white"
          >
            {t('backToBatch')}
          </Link>
        </div>
      </div>
    );
  }

  const { report } = creator;
  const recommendation = report ? getRecommendation(report.riskLevel) : null;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/batches/${batchId}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-zinc-200 font-light tracking-wide">{creator.name}</h1>
              <SafetyBadge rating={overallSafetyRating} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
            </button>
            <button className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button className="px-4 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors flex items-center gap-1.5">
              <X className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>
      </header>

      {/* Safety Summary (collapsible) */}
      {aggregatedSafetyRationale && (
        <div className="border-b border-zinc-900">
          <button
            onClick={() => setIsSafetySummaryExpanded(!isSafetySummaryExpanded)}
            className="w-full px-6 py-2 flex items-center justify-between text-left hover:bg-zinc-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-zinc-500">Safety Summary</span>
              <div className="flex items-center gap-1.5">
                {aggregatedEvidence.filter(e => e.severity === 'high').length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">
                    {aggregatedEvidence.filter(e => e.severity === 'high').length} high
                  </span>
                )}
                {aggregatedEvidence.filter(e => e.severity === 'medium').length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded">
                    {aggregatedEvidence.filter(e => e.severity === 'medium').length} med
                  </span>
                )}
                {aggregatedEvidence.filter(e => e.severity === 'low').length > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
                    {aggregatedEvidence.filter(e => e.severity === 'low').length} low
                  </span>
                )}
              </div>
            </div>
            {isSafetySummaryExpanded ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>
          {isSafetySummaryExpanded && (
            <div className="px-6 pb-4">
              <SafetySummary
                rating={overallSafetyRating}
                safetyRationale={aggregatedSafetyRationale}
              />
            </div>
          )}
        </div>
      )}

      {/* Main Split View - 40/60 layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Flag Digest + Posts List (40%) */}
        <div className="w-[40%] border-r border-zinc-900 flex flex-col overflow-hidden">
          {/* Flag Digest */}
          <div className="flex-shrink-0 border-b border-zinc-900 overflow-y-auto max-h-[50%]">
            <div className="p-4">
              {selectedFinding ? (
                // Show flags for selected finding
                <FlagDigest
                  evidence={selectedFindingEvidence}
                  selectedFlagId={selectedFlagEvidence ? `${selectedFlagEvidence.category}-${selectedFlagEvidence.timestamp}-0` : undefined}
                  onFlagClick={handleFlagClick}
                  onTimestampClick={handleSeekToTime}
                />
              ) : (
                // Show all aggregated flags
                <FlagDigest
                  evidence={aggregatedEvidence}
                  selectedFlagId={selectedFlagEvidence ? `${selectedFlagEvidence.category}-${selectedFlagEvidence.timestamp}-0` : undefined}
                  onFlagClick={handleFlagClick}
                  onTimestampClick={handleSeekToTime}
                />
              )}
            </div>
          </div>

          {/* Posts List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <PostsList
                posts={filteredFindings}
                selectedPostId={selectedFinding?.socialMediaSource?.postId}
                onPostSelect={handlePostSelect}
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Media Viewer + Evidence Detail (60%) */}
        <div className="w-[60%] overflow-y-auto">
          {selectedFinding ? (
            // Finding Detail - Enhanced with Video Player and Evidence Panel
            <div className="p-6 space-y-4">
              {/* Back button and header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedFinding(null);
                    setSelectedFlagEvidence(null);
                    setCurrentVideoTime(0);
                    setIsVideoPlaying(false);
                  }}
                  className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
                >
                  {t('backToSummary')}
                </button>
                <a
                  href={selectedFinding.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                >
                  {t('viewSource')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Media Viewer Section */}
              <div className="space-y-3">
                {/* Video Player (for video content) */}
                {selectedFinding.socialMediaSource?.mediaType === 'video' ? (
                  <VideoPlayer
                    src={selectedFinding.socialMediaSource.mediaUrl}
                    poster={selectedFinding.socialMediaSource.thumbnailUrl}
                    analysis={selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData}
                    fallbackUrl={selectedFinding.source.url}
                    onTimeUpdate={setCurrentVideoTime}
                    onDurationChange={setVideoDuration}
                    onPlayStateChange={setIsVideoPlaying}
                    seekRequest={seekRequest}
                    hideControls={true}
                    externalIsPlaying={isVideoPlaying}
                    className="rounded-lg overflow-hidden"
                  />
                ) : selectedFinding.socialMediaSource?.thumbnailUrl ? (
                  // Image viewer for images
                  <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
                    <img
                      src={selectedFinding.socialMediaSource.thumbnailUrl}
                      alt={selectedFinding.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : null}

                {/* Interactive Timeline with Flag Markers */}
                {selectedFinding.socialMediaSource?.visualAnalysis && (
                  <VideoTimeline
                    analysis={selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData}
                    evidence={selectedFindingEvidence}
                    duration={videoDuration || (selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).videoDuration}
                    currentTime={currentVideoTime}
                    isPlaying={isVideoPlaying}
                    onSeek={handleSeekToTime}
                    onTogglePlay={() => setIsVideoPlaying(!isVideoPlaying)}
                    onFlagClick={handleFlagClick}
                    className="pb-3 border-b border-zinc-800"
                  />
                )}
              </div>

              {/* Evidence Detail Section */}
              {selectedFlagEvidence ? (
                <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded uppercase',
                        selectedFlagEvidence.severity === 'high' && 'bg-red-500/20 text-red-400',
                        selectedFlagEvidence.severity === 'medium' && 'bg-amber-500/20 text-amber-400',
                        selectedFlagEvidence.severity === 'low' && 'bg-yellow-500/20 text-yellow-400'
                      )}>
                        {selectedFlagEvidence.category}
                      </span>
                      <span className="text-xs text-zinc-500 uppercase">
                        {selectedFlagEvidence.severity}
                      </span>
                      <span className="text-xs text-zinc-600">·</span>
                      <span className="text-xs text-zinc-500 capitalize">
                        {selectedFlagEvidence.source}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedFlagEvidence(null)}
                      className="text-zinc-600 hover:text-zinc-400 text-xs"
                    >
                      Clear
                    </button>
                  </div>

                  {selectedFlagEvidence.quote && (
                    <blockquote className="pl-3 border-l-2 border-zinc-700 text-zinc-300 italic">
                      "{selectedFlagEvidence.quote}"
                    </blockquote>
                  )}

                  {selectedFlagEvidence.description && (
                    <p className="text-sm text-zinc-400">{selectedFlagEvidence.description}</p>
                  )}

                  {selectedFlagEvidence.context && (
                    <p className="text-xs text-zinc-500">
                      <span className="text-zinc-600">Context:</span> {selectedFlagEvidence.context}
                    </p>
                  )}
                </div>
              ) : selectedFindingEvidence.length > 0 ? (
                <EvidencePanel
                  evidence={selectedFindingEvidence}
                  onTimestampClick={handleSeekToTime}
                  className="bg-zinc-900/30 rounded-lg p-4"
                />
              ) : null}

              {/* Expandable Analysis Panels */}
              {selectedFinding.socialMediaSource?.visualAnalysis && (
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  {/* Safety Score Breakdown - Collapsible */}
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-zinc-400 hover:text-zinc-300">
                      <span>Safety Score Breakdown</span>
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <SafetyScoreBreakdown
                      classification={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).contentClassification}
                      brandSafetyRating={selectedFinding.socialMediaSource.visualAnalysis.brandSafetyRating}
                      className="mt-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800"
                    />
                  </details>

                  {/* Brand Exposure Panel - Collapsible */}
                  {(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).logoDetections && (
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-zinc-400 hover:text-zinc-300">
                        <span>Brand Exposure ({(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).logoDetections?.length || 0} brands)</span>
                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      </summary>
                      <BrandExposurePanel
                        logoDetections={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).logoDetections}
                        videoDuration={videoDuration || (selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).videoDuration}
                        onBrandClick={(brand, time) => handleSeekToTime(time)}
                        className="mt-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800"
                      />
                    </details>
                  )}

                  {/* Transcript Panel - Collapsible */}
                  {((selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).transcriptSegments || selectedFinding.socialMediaSource.visualAnalysis.description) && (
                    <details className="group" open>
                      <summary className="flex items-center justify-between cursor-pointer py-2 text-sm text-zinc-400 hover:text-zinc-300">
                        <span>Transcript</span>
                        <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      </summary>
                      <TranscriptPanel
                        segments={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).transcriptSegments}
                        fullText={selectedFinding.socialMediaSource.visualAnalysis.description}
                        brands={selectedFinding.socialMediaSource.visualAnalysis.brands.map(b => b.brand)}
                        currentTime={currentVideoTime}
                        onSeek={handleSeekToTime}
                        className="mt-2 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 max-h-64"
                      />
                    </details>
                  )}
                </div>
              )}

              {/* Post Info */}
              <div className="pt-3 border-t border-zinc-800">
                <p className="text-sm text-zinc-400 leading-relaxed">{selectedFinding.summary}</p>
                {selectedFinding.source.publishedDate && (
                  <p className="text-xs text-zinc-600 mt-2">Published: {selectedFinding.source.publishedDate}</p>
                )}
              </div>
            </div>
          ) : (
            // Overview - Select a post to review
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-md">
                {/* Competitor Alert (if any) */}
                {competitorBrandNames.length > 0 && aggregatedLogoDetections.length > 0 && (
                  <div className="mb-8">
                    <CompetitorAlert
                      logoDetections={aggregatedLogoDetections}
                      competitorBrands={competitorBrandNames}
                      onBrandClick={(brand, time) => {
                        // Find the finding with this brand and select it
                        const findingWithBrand = socialFindings.find(f => {
                          const va = f.socialMediaSource?.visualAnalysis as VisualAnalysisData | undefined;
                          return va?.logoDetections?.some(l => l.brand === brand);
                        });
                        if (findingWithBrand) {
                          handlePostSelect(findingWithBrand);
                          handleSeekToTime(time);
                        }
                      }}
                    />
                  </div>
                )}

                {/* Main prompt */}
                <div className="mb-8">
                  <Eye className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <h2 className="text-xl text-zinc-300 font-light mb-2">
                    {aggregatedEvidence.length > 0
                      ? 'Select a flag or post to review'
                      : 'Select a post to view details'}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {aggregatedEvidence.length > 0
                      ? `${aggregatedEvidence.length} flags detected across ${socialFindings.length} posts`
                      : `${socialFindings.length} posts available for review`}
                  </p>
                  {/* Analysis Coverage Stats */}
                  {aggregatedSafetyRationale?.coverageStats && (
                    <div className="flex items-center justify-center gap-3 mt-3 text-xs text-zinc-600">
                      <span>{socialFindings.length} posts analyzed</span>
                      <span className="text-zinc-700">•</span>
                      <span>
                        {(() => {
                          const secs = aggregatedSafetyRationale.coverageStats.videoDuration || 0;
                          const mins = Math.floor(secs / 60);
                          const hours = Math.floor(mins / 60);
                          const remainingMins = mins % 60;
                          if (hours > 0) return `${hours}h ${remainingMins}m of video`;
                          if (mins > 0) return `${mins}m of video`;
                          return `${Math.round(secs)}s of video`;
                        })()}
                      </span>
                      <span className="text-zinc-700">•</span>
                      <span>{(aggregatedSafetyRationale.coverageStats.transcriptWords || 0).toLocaleString()} words analyzed</span>
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <div className="text-2xl text-zinc-300 font-light">{socialFindings.length}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Posts</div>
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <div className="text-2xl text-zinc-300 font-light">{aggregatedEvidence.length}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Flags</div>
                  </div>
                  <div className="p-3 bg-zinc-900/50 rounded-lg">
                    <div className="text-2xl text-zinc-300 font-light">{brandPartnerships.length}</div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Brands</div>
                  </div>
                </div>

                {/* Verdict */}
                {recommendation && report?.summary && (
                  <div className="text-left p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        'text-sm uppercase tracking-wider font-medium',
                        recommendation.color
                      )}>
                        {recommendation.action}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                      {report.summary.split('\n')[0]}
                    </p>
                  </div>
                )}

                {/* Web Findings */}
                {webFindings.length > 0 && (
                  <div className="mt-8 text-left">
                    <p className="text-zinc-500 text-xs uppercase tracking-wider mb-3">
                      Web Research ({webFindings.length})
                    </p>
                    <div className="space-y-2">
                      {webFindings.slice(0, 3).map((finding, idx) => (
                        <a
                          key={idx}
                          href={finding.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            finding.severity === 'critical' && 'bg-red-500',
                            finding.severity === 'high' && 'bg-orange-500',
                            finding.severity === 'medium' && 'bg-amber-500',
                            finding.severity === 'low' && 'bg-zinc-600',
                          )} />
                          <span className="truncate">{finding.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                      {webFindings.length > 3 && (
                        <p className="text-xs text-zinc-600">+{webFindings.length - 3} more findings</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Profiles */}
                {creator.socialLinks?.length > 0 && (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {(creator.socialLinks || []).map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 rounded transition-colors"
                      >
                        {getPlatformFromUrl(link)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
