'use client';

import { useEffect, useState, useMemo, useCallback, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe, Download, Eye, Tag, AlertTriangle, Play } from 'lucide-react';
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
import type { Finding, RiskLevel, VisualAnalysisData } from '@/types';

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
  const [filter, setFilter] = useState<Filter>('all');

  // Video playback synchronization state
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [seekToTime, setSeekToTime] = useState<number | undefined>();

  // Handle seeking from timeline, transcript, or brand clicks
  const handleSeekToTime = useCallback((time: number) => {
    setSeekToTime(time);
    // Clear after a short delay to allow video to seek
    setTimeout(() => setSeekToTime(undefined), 100);
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
      <header className="border-b border-zinc-900 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href={`/${locale}/batches/${batchId}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-zinc-200 font-light tracking-wide">{creator.name}</h1>
              <p className="text-zinc-600 text-sm">
                {socialFindings.length} {t('posts')} · {brandPartnerships.length} {t('brands')} · {webFindings.length} {t('findings')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {recommendation && (
              <span className={cn(
                'text-sm uppercase tracking-wider px-3 py-1',
                recommendation.color
              )}>
                {recommendation.action}
              </span>
            )}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="p-2 text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-50"
              title="Export PDF"
            >
              <Download className="w-5 h-5" />
            </button>
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
                  {t(`filters.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="p-6">
            {filteredFindings.length > 0 ? (
              <div className="grid grid-cols-4 gap-1">
                {filteredFindings.map((finding, idx) => {
                  const platform = getPlatformFromFinding(finding);
                  const PlatformIcon = platformIcons[platform];
                  const isFlagged = finding.severity === 'critical' || finding.severity === 'high';
                  const isSelected = selectedFinding === finding;

                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedFinding(finding)}
                      className={cn(
                        'aspect-square relative bg-zinc-900 transition-all group overflow-hidden',
                        isSelected && 'ring-2 ring-zinc-500',
                        isFlagged && !isSelected && 'ring-2 ring-red-500/50'
                      )}
                    >
                      {/* Thumbnail or placeholder */}
                      {finding.socialMediaSource?.thumbnailUrl ? (
                        <img
                          src={finding.socialMediaSource.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
                          <PlatformIcon className="w-8 h-8 text-zinc-700" />
                        </div>
                      )}

                      {/* Dark gradient overlay for better text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />

                      {/* Category labels overlay */}
                      {finding.socialMediaSource?.visualAnalysis && (
                        <div className="absolute top-0 left-0 right-0 p-1.5 flex flex-wrap gap-1">
                          {finding.socialMediaSource.visualAnalysis.sceneContext?.contentType && (
                            <span className={cn(
                              'px-1.5 py-0.5 text-[9px] font-medium rounded uppercase tracking-wide',
                              finding.socialMediaSource.visualAnalysis.brandSafetyRating === 'unsafe'
                                ? 'bg-red-500/90 text-white'
                                : finding.socialMediaSource.visualAnalysis.brandSafetyRating === 'caution'
                                ? 'bg-amber-500/90 text-zinc-900'
                                : 'bg-zinc-800/90 text-zinc-300'
                            )}>
                              {finding.socialMediaSource.visualAnalysis.sceneContext.contentType}
                            </span>
                          )}
                          {finding.socialMediaSource.visualAnalysis.sceneContext?.concerns?.slice(0, 1).map((concern, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[9px] font-medium rounded uppercase tracking-wide bg-red-500/90 text-white">
                              {concern.length > 12 ? concern.slice(0, 12) + '…' : concern}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom info bar */}
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div className="flex items-center justify-between">
                          {/* Platform & severity */}
                          <div className="flex items-center gap-1.5">
                            <PlatformIcon className="w-3 h-3 text-white/70" />
                            {isFlagged && (
                              <span className={cn(
                                'px-1 py-0.5 text-[8px] font-bold rounded uppercase',
                                finding.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                              )}>
                                {finding.severity === 'critical' ? 'CRIT' : 'HIGH'}
                              </span>
                            )}
                          </div>

                          {/* Visual analysis indicators */}
                          {finding.socialMediaSource?.visualAnalysis && (
                            <div className="flex items-center gap-1">
                              {/* Video indicator */}
                              {finding.socialMediaSource.mediaType === 'video' && (
                                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-zinc-900/80 rounded">
                                  <Play className="w-2.5 h-2.5 text-white/70" />
                                </div>
                              )}
                              <div className="flex items-center gap-0.5 px-1 py-0.5 bg-zinc-900/80 rounded">
                                <Eye className="w-2.5 h-2.5 text-blue-400" />
                              </div>
                              {finding.socialMediaSource.visualAnalysis.brands.length > 0 && (
                                <div className="flex items-center gap-0.5 px-1 py-0.5 bg-zinc-900/80 rounded">
                                  <Tag className="w-2.5 h-2.5 text-purple-400" />
                                  <span className="text-[8px] text-purple-300">
                                    {finding.socialMediaSource.visualAnalysis.brands.length}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover overlay with full details */}
                      <div className="absolute inset-0 bg-zinc-950/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <span className="text-[10px] text-zinc-400 line-clamp-3 leading-relaxed">{finding.title}</span>
                        {finding.socialMediaSource?.visualAnalysis?.brands.slice(0, 2).map((brand, i) => (
                          <span key={i} className="text-[9px] text-purple-400 mt-1">
                            🏷 {brand.brand}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-600 text-sm">
                  {filter === 'all' ? t('noPosts') : t('noPostsFilter', { filter: t(`filters.${filter}`) })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Context Panel */}
        <div className="w-[40%] overflow-y-auto">
          {selectedFinding ? (
            // Finding Detail - Enhanced with Video Player and Analysis Panels
            <div className="p-6 space-y-6">
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  setCurrentVideoTime(0);
                  setIsVideoPlaying(false);
                }}
                className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
              >
                {t('backToSummary')}
              </button>

              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {(() => {
                    const platform = getPlatformFromFinding(selectedFinding);
                    const Icon = platformIcons[platform];
                    return <Icon className="w-4 h-4 text-zinc-600" />;
                  })()}
                  <span className={cn(
                    'text-xs uppercase tracking-wider',
                    selectedFinding.severity === 'critical' && 'text-red-500',
                    selectedFinding.severity === 'high' && 'text-orange-500',
                    selectedFinding.severity === 'medium' && 'text-amber-500',
                    selectedFinding.severity === 'low' && 'text-emerald-500',
                  )}>
                    {tRisk(selectedFinding.severity)}
                  </span>
                </div>
                <h2 className="text-zinc-200 font-light text-lg">{selectedFinding.title}</h2>
                {selectedFinding.source.publishedDate && (
                  <p className="text-zinc-600 text-sm mt-1">{selectedFinding.source.publishedDate}</p>
                )}
              </div>

              {/* Video Player (for video content) */}
              {selectedFinding.socialMediaSource?.mediaType === 'video' && (
                <VideoPlayer
                  src={selectedFinding.socialMediaSource.mediaUrl}
                  poster={selectedFinding.socialMediaSource.thumbnailUrl}
                  analysis={selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData}
                  fallbackUrl={selectedFinding.source.url}
                  onTimeUpdate={setCurrentVideoTime}
                  onDurationChange={setVideoDuration}
                  onPlayStateChange={setIsVideoPlaying}
                  externalSeekTo={seekToTime}
                  className="rounded-lg overflow-hidden"
                />
              )}

              {/* Interactive Timeline */}
              {selectedFinding.socialMediaSource?.visualAnalysis && (
                <VideoTimeline
                  analysis={selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData}
                  duration={videoDuration || (selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).videoDuration}
                  currentTime={currentVideoTime}
                  isPlaying={isVideoPlaying}
                  onSeek={handleSeekToTime}
                  onTogglePlay={() => setIsVideoPlaying(!isVideoPlaying)}
                  className="pb-4 border-b border-zinc-800"
                />
              )}

              {/* Analysis Panels Grid */}
              {selectedFinding.socialMediaSource?.visualAnalysis && (
                <div className="grid grid-cols-1 gap-4">
                  {/* Safety Score Breakdown */}
                  <SafetyScoreBreakdown
                    classification={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).contentClassification}
                    brandSafetyRating={selectedFinding.socialMediaSource.visualAnalysis.brandSafetyRating}
                    className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800"
                  />

                  {/* Brand Exposure Panel */}
                  {(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).logoDetections && (
                    <BrandExposurePanel
                      logoDetections={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).logoDetections}
                      videoDuration={videoDuration || (selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).videoDuration}
                      onBrandClick={(brand, time) => handleSeekToTime(time)}
                      className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800"
                    />
                  )}

                  {/* Transcript Panel */}
                  {((selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).transcriptSegments || selectedFinding.socialMediaSource.visualAnalysis.description) && (
                    <TranscriptPanel
                      segments={(selectedFinding.socialMediaSource.visualAnalysis as VisualAnalysisData).transcriptSegments}
                      fullText={selectedFinding.socialMediaSource.visualAnalysis.description}
                      brands={selectedFinding.socialMediaSource.visualAnalysis.brands.map(b => b.brand)}
                      currentTime={currentVideoTime}
                      onSeek={handleSeekToTime}
                      className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 max-h-64"
                    />
                  )}
                </div>
              )}

              {/* Summary */}
              <p className="text-zinc-400 text-sm leading-relaxed">{selectedFinding.summary}</p>

              {/* Legacy Visual Analysis Panel (for non-video or basic data) */}
              {selectedFinding.socialMediaSource?.visualAnalysis &&
               !selectedFinding.socialMediaSource.visualAnalysis.logoDetections &&
               !selectedFinding.socialMediaSource.visualAnalysis.contentClassification && (
                <div className="pt-4 border-t border-zinc-800">
                  <VisualAnalysisPanel
                    analysis={selectedFinding.socialMediaSource.visualAnalysis}
                    showTimeline={false}
                  />
                </div>
              )}

              {/* Source Link */}
              <a
                href={selectedFinding.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                {t('viewSource')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            // Summary - Enhanced with Video Analysis Insights
            <div className="p-6 space-y-8">
              {/* Competitor Alert (if any) */}
              {competitorBrandNames.length > 0 && aggregatedLogoDetections.length > 0 && (
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
                      setSelectedFinding(findingWithBrand);
                      handleSeekToTime(time);
                    }
                  }}
                />
              )}

              {/* Verdict */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">{t('verdict')}</p>
                {recommendation && (
                  <span className={cn(
                    'text-lg uppercase tracking-wider',
                    recommendation.color
                  )}>
                    {recommendation.action}
                  </span>
                )}
                {report?.summary && (
                  <p className="text-zinc-400 text-sm mt-3 leading-relaxed line-clamp-4">
                    {report.summary.split('\n')[0]}
                  </p>
                )}
              </div>

              {/* Brand Partnerships */}
              {brandPartnerships.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                    {t('brandPartnerships')} ({brandPartnerships.length})
                  </p>
                  <div className="space-y-2">
                    {brandPartnerships.slice(0, 10).map((brand, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className={cn(
                          'text-sm',
                          brand.isCompetitor ? 'text-red-400' : 'text-zinc-300'
                        )}>
                          {brand.brandName}
                          {brand.isCompetitor && ` ${t('competitor')}`}
                        </span>
                        <span className="text-zinc-600 text-xs">{brand.platform}</span>
                      </div>
                    ))}
                    {brandPartnerships.length > 10 && (
                      <p className="text-zinc-600 text-xs">{t('more', { count: brandPartnerships.length - 10 })}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Social Profiles */}
              {creator.socialLinks?.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                    {t('socialProfiles')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(creator.socialLinks || []).map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {getPlatformFromUrl(link)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Web Findings / Research */}
              {webFindings.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                    {t('researchFindings')} ({webFindings.length})
                  </p>
                  <div className="space-y-4">
                    {webFindings.map((finding, idx) => (
                      <a
                        key={idx}
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
                              <span className="text-zinc-600 text-xs truncate">{finding.source.title}</span>
                              {finding.source.publishedDate && (
                                <>
                                  <span className="text-zinc-700 text-xs">·</span>
                                  <span className="text-zinc-700 text-xs">{finding.source.publishedDate}</span>
                                </>
                              )}
                              <ExternalLink className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0" />
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Analysis Summary */}
              <VisualAnalysisSummary findings={socialFindings} />

              {/* Brand Exposure Summary (aggregated from all videos) */}
              {aggregatedLogoDetections.length > 0 && (
                <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
                  <BrandExposureSummary logoDetections={aggregatedLogoDetections} />
                </div>
              )}

              {/* Risk Breakdown */}
              {report && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">{t('riskBreakdown')}</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xl text-red-500 font-light">{stats.critical}</span>
                      <span className="text-zinc-600 text-sm ml-1">{tRisk('critical').toLowerCase()}</span>
                    </div>
                    <div>
                      <span className="text-xl text-orange-500 font-light">{stats.high}</span>
                      <span className="text-zinc-600 text-sm ml-1">{tRisk('high').toLowerCase()}</span>
                    </div>
                    <div>
                      <span className="text-xl text-amber-500 font-light">{stats.medium}</span>
                      <span className="text-zinc-600 text-sm ml-1">{tRisk('medium').toLowerCase().slice(0, 3)}</span>
                    </div>
                    <div>
                      <span className="text-xl text-zinc-500 font-light">{stats.low}</span>
                      <span className="text-zinc-600 text-sm ml-1">{tRisk('low').toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
