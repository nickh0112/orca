'use client';

import { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, ExternalLink, Instagram, Youtube, Music2, Globe, Download } from 'lucide-react';
import { cn, getPlatformFromUrl } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { generateCreatorPdf } from '@/components/report/creator-pdf';
import type { Finding, RiskLevel } from '@/types';

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
        return { action: 'review', color: 'text-red-500' };
      case 'MEDIUM':
        return { action: 'review', color: 'text-amber-500' };
      case 'LOW':
        return { action: 'approve', color: 'text-emerald-500' };
      default:
        return { action: 'review', color: 'text-zinc-500' };
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
          <p className="text-zinc-400 mb-4">Creator not found</p>
          <Link
            href={`/batches/${batchId}`}
            className="text-zinc-300 hover:text-white"
          >
            Back to batch
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
              href={`/batches/${batchId}`}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-zinc-200 font-light tracking-wide">{creator.name}</h1>
              <p className="text-zinc-600 text-sm">
                {socialFindings.length} posts · {brandPartnerships.length} brands · {webFindings.length} findings
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
                  {f}
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
                        'aspect-square relative bg-zinc-900 transition-all group',
                        isSelected && 'ring-1 ring-zinc-600',
                        isFlagged && 'ring-1 ring-red-900'
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
                        <div className="absolute inset-0 flex items-center justify-center">
                          <PlatformIcon className="w-6 h-6 text-zinc-800" />
                        </div>
                      )}

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
            ) : (
              <div className="text-center py-12">
                <p className="text-zinc-600 text-sm">No {filter === 'all' ? '' : filter} posts found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Context Panel */}
        <div className="w-[40%] overflow-y-auto">
          {selectedFinding ? (
            // Finding Detail
            <div className="p-8">
              <button
                onClick={() => setSelectedFinding(null)}
                className="text-zinc-600 hover:text-zinc-400 text-sm mb-6 transition-colors"
              >
                ← back to summary
              </button>

              <div className="space-y-8">
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
                      {selectedFinding.severity}
                    </span>
                  </div>
                  <h2 className="text-zinc-200 font-light">{selectedFinding.title}</h2>
                  {selectedFinding.source.publishedDate && (
                    <p className="text-zinc-600 text-sm mt-1">{selectedFinding.source.publishedDate}</p>
                  )}
                </div>

                {/* Summary */}
                <p className="text-zinc-400 text-sm leading-relaxed">{selectedFinding.summary}</p>

                {/* Source */}
                <a
                  href={selectedFinding.source.url}
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
                    Brand Partnerships ({brandPartnerships.length})
                  </p>
                  <div className="space-y-2">
                    {brandPartnerships.slice(0, 10).map((brand, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className={cn(
                          'text-sm',
                          brand.isCompetitor ? 'text-red-400' : 'text-zinc-300'
                        )}>
                          {brand.brandName}
                          {brand.isCompetitor && ' (competitor)'}
                        </span>
                        <span className="text-zinc-600 text-xs">{brand.platform}</span>
                      </div>
                    ))}
                    {brandPartnerships.length > 10 && (
                      <p className="text-zinc-600 text-xs">+{brandPartnerships.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Social Profiles */}
              {creator.socialLinks?.length > 0 && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">
                    Social Profiles
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
                    Research Findings ({webFindings.length})
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

              {/* Risk Breakdown */}
              {report && (
                <div>
                  <p className="text-zinc-600 text-xs uppercase tracking-wider mb-3">Risk Breakdown</p>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-xl text-red-500 font-light">{stats.critical}</span>
                      <span className="text-zinc-600 text-sm ml-1">critical</span>
                    </div>
                    <div>
                      <span className="text-xl text-orange-500 font-light">{stats.high}</span>
                      <span className="text-zinc-600 text-sm ml-1">high</span>
                    </div>
                    <div>
                      <span className="text-xl text-amber-500 font-light">{stats.medium}</span>
                      <span className="text-zinc-600 text-sm ml-1">med</span>
                    </div>
                    <div>
                      <span className="text-xl text-zinc-500 font-light">{stats.low}</span>
                      <span className="text-zinc-600 text-sm ml-1">low</span>
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
