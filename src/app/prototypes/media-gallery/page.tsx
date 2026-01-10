'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Instagram,
  Youtube,
  Music2,
  Globe,
  Play,
  ExternalLink,
  Filter,
  X,
  AlertTriangle,
  ImageOff,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Finding, RiskLevel, Severity } from '@/types';

// Platform icon mapping
const platformIcons = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  web: Globe,
};

// Severity colors
const severityColors: Record<Severity, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const severityBorder: Record<Severity, string> = {
  critical: 'border-red-500/50',
  high: 'border-orange-500/50',
  medium: 'border-yellow-500/50',
  low: 'border-green-500/50',
};

interface CreatorData {
  id: string;
  name: string;
  socialLinks: string[];
  report: {
    riskLevel: RiskLevel;
    summary: string | null;
    findings: Finding[];
  } | null;
}

interface CreatorListItem {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  findingsCount: number;
}

export default function MediaGalleryPrototype() {
  const searchParams = useSearchParams();
  const creatorIdParam = searchParams.get('creatorId');

  const [creators, setCreators] = useState<CreatorListItem[]>([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(creatorIdParam);
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch available creators on mount
  useEffect(() => {
    fetch('/api/creators')
      .then((res) => res.json())
      .then((data) => {
        // Handle error responses
        if (!Array.isArray(data)) {
          console.error('API returned non-array:', data);
          return;
        }

        const creatorsWithReports = data
          .filter((c: { report: unknown }) => c.report)
          .map((c: { id: string; name: string; report: { riskLevel: RiskLevel; findings: string } }) => {
            let findingsCount = 0;
            try {
              findingsCount = JSON.parse(c.report.findings).length;
            } catch {
              console.error('Failed to parse findings for', c.name);
            }
            return {
              id: c.id,
              name: c.name,
              riskLevel: c.report.riskLevel,
              findingsCount,
            };
          });
        setCreators(creatorsWithReports);

        // Auto-select first creator if none specified
        if (!selectedCreatorId && creatorsWithReports.length > 0) {
          setSelectedCreatorId(creatorsWithReports[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch creators:', err);
      });
  }, [selectedCreatorId]);

  // Fetch creator data when selection changes
  useEffect(() => {
    if (!selectedCreatorId) return;

    setIsLoading(true);
    fetch(`/api/creators/${selectedCreatorId}`)
      .then((res) => res.json())
      .then((data) => {
        setCreator(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [selectedCreatorId]);

  // Filter findings
  const filteredFindings = useMemo(() => {
    if (!creator?.report?.findings) return [];

    return creator.report.findings.filter((finding) => {
      // Platform filter
      if (platformFilter !== 'all') {
        const platform = finding.socialMediaSource?.platform || 'web';
        if (platform !== platformFilter) return false;
      }

      // Severity filter
      if (severityFilter !== 'all' && finding.severity !== severityFilter) {
        return false;
      }

      return true;
    });
  }, [creator?.report?.findings, platformFilter, severityFilter]);

  // Get unique platforms from findings
  const platforms = useMemo(() => {
    if (!creator?.report?.findings) return [];
    const platformSet = new Set(
      creator.report.findings.map((f) => f.socialMediaSource?.platform || 'web')
    );
    return Array.from(platformSet);
  }, [creator?.report?.findings]);

  // Media findings (those with thumbnails)
  const mediaFindings = filteredFindings.filter(
    (f) => f.socialMediaSource?.thumbnailUrl || f.socialMediaSource?.mediaUrl
  );

  // Text-only findings
  const textFindings = filteredFindings.filter(
    (f) => !f.socialMediaSource?.thumbnailUrl && !f.socialMediaSource?.mediaUrl
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/prototypes"
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-zinc-100">Media Gallery</h1>
                <p className="text-sm text-zinc-500">Visual content review with real data</p>
              </div>
            </div>

            {/* Creator Selector */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                <span className="text-zinc-300">
                  {creator?.name || 'Select Creator'}
                </span>
                <ChevronDown className={cn(
                  'w-4 h-4 text-zinc-400 transition-transform',
                  showDropdown && 'rotate-180'
                )} />
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
                  {creators.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCreatorId(c.id);
                        setShowDropdown(false);
                      }}
                      className={cn(
                        'w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between',
                        c.id === selectedCreatorId && 'bg-zinc-700'
                      )}
                    >
                      <span className="text-zinc-200">{c.name}</span>
                      <span className="text-xs text-zinc-500">
                        {c.findingsCount} findings
                      </span>
                    </button>
                  ))}
                  {creators.length === 0 && (
                    <div className="px-4 py-3 text-zinc-500 text-sm">
                      No reports available
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          {creator && (
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-500">Filter:</span>
              </div>

              {/* Platform Filter */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setPlatformFilter('all')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    platformFilter === 'all'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  All Platforms
                </button>
                {platforms.map((platform) => {
                  const Icon = platformIcons[platform as keyof typeof platformIcons] || Globe;
                  return (
                    <button
                      key={platform}
                      onClick={() => setPlatformFilter(platform)}
                      className={cn(
                        'px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1.5',
                        platformFilter === platform
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {platform}
                    </button>
                  );
                })}
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={cn(
                    'px-3 py-1 text-sm rounded-md transition-colors',
                    severityFilter === 'all'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  All Severity
                </button>
                {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={cn(
                      'px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1.5',
                      severityFilter === sev
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', severityColors[sev])} />
                    {sev}
                  </button>
                ))}
              </div>

              <div className="ml-auto text-sm text-zinc-500">
                {filteredFindings.length} finding{filteredFindings.length !== 1 ? 's' : ''}
                {mediaFindings.length > 0 && ` (${mediaFindings.length} with media)`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400" />
          </div>
        ) : !creator ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">Select a creator to view their report</p>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500">No findings match the current filters</p>
          </div>
        ) : (
          <>
            {/* Media Gallery Grid */}
            {mediaFindings.length > 0 && (
              <section className="mb-12">
                <h2 className="text-lg font-medium text-zinc-200 mb-4">
                  Media Content ({mediaFindings.length})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaFindings.map((finding, i) => (
                    <MediaCard
                      key={i}
                      finding={finding}
                      onClick={() => setSelectedFinding(finding)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Text-only findings */}
            {textFindings.length > 0 && (
              <section>
                <h2 className="text-lg font-medium text-zinc-200 mb-4">
                  Web & Text Findings ({textFindings.length})
                </h2>
                <div className="space-y-3">
                  {textFindings.map((finding, i) => (
                    <TextFindingCard
                      key={i}
                      finding={finding}
                      onClick={() => setSelectedFinding(finding)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedFinding && (
        <FindingModal
          finding={selectedFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
}

// Media Card Component
function MediaCard({ finding, onClick }: { finding: Finding; onClick: () => void }) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = finding.socialMediaSource?.thumbnailUrl || finding.socialMediaSource?.mediaUrl;
  const platform = finding.socialMediaSource?.platform || 'web';
  const Icon = platformIcons[platform as keyof typeof platformIcons] || Globe;
  const isVideo = finding.socialMediaSource?.mediaType === 'video';

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border-2 group transition-all hover:scale-[1.02]',
        severityBorder[finding.severity]
      )}
    >
      {/* Thumbnail */}
      {thumbnailUrl && !imageError ? (
        <Image
          src={thumbnailUrl}
          alt={finding.title}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
          <ImageOff className="w-8 h-8 text-zinc-600" />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Play button for videos */}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Platform badge */}
      <div className="absolute top-2 left-2 p-1.5 bg-black/60 rounded-lg">
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Severity badge */}
      <div className={cn(
        'absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase',
        severityColors[finding.severity],
        'text-white'
      )}>
        {finding.severity}
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm text-white font-medium line-clamp-2">
          {finding.title}
        </p>
      </div>
    </button>
  );
}

// Text Finding Card
function TextFindingCard({ finding, onClick }: { finding: Finding; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 bg-zinc-900 rounded-xl border-l-4 hover:bg-zinc-800 transition-colors',
        severityBorder[finding.severity].replace('/50', '')
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn(
          'w-5 h-5 mt-0.5',
          finding.severity === 'critical' && 'text-red-500',
          finding.severity === 'high' && 'text-orange-500',
          finding.severity === 'medium' && 'text-yellow-500',
          finding.severity === 'low' && 'text-green-500'
        )} />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-zinc-200 mb-1">{finding.title}</h3>
          <p className="text-sm text-zinc-400 line-clamp-2">{finding.summary}</p>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded text-[10px] font-medium uppercase shrink-0',
          severityColors[finding.severity],
          'text-white'
        )}>
          {finding.severity}
        </span>
      </div>
    </button>
  );
}

// Finding Modal
function FindingModal({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = finding.socialMediaSource?.thumbnailUrl || finding.socialMediaSource?.mediaUrl;
  const platform = finding.socialMediaSource?.platform || 'web';
  const Icon = platformIcons[platform as keyof typeof platformIcons] || Globe;
  const isVideo = finding.socialMediaSource?.mediaType === 'video';

  // Extract video ID for YouTube embeds
  const youtubeVideoId = platform === 'youtube'
    ? finding.source.url.match(/[?&]v=([^&]+)/)?.[1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div
        className="bg-zinc-900 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media */}
        {isVideo && youtubeVideoId ? (
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : isVideo && platform === 'tiktok' ? (
          <div className="aspect-video bg-black flex items-center justify-center">
            <a
              href={finding.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {thumbnailUrl && !imageError ? (
                <Image
                  src={thumbnailUrl}
                  alt={finding.title}
                  width={300}
                  height={400}
                  className="rounded-lg"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              ) : (
                <>
                  <Play className="w-16 h-16" />
                  <span>Watch on TikTok</span>
                </>
              )}
            </a>
          </div>
        ) : thumbnailUrl && !imageError ? (
          <div className="relative aspect-video bg-black">
            <Image
              src={thumbnailUrl}
              alt={finding.title}
              fill
              className="object-contain"
              onError={() => setImageError(true)}
              unoptimized
            />
          </div>
        ) : null}

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-800 rounded-lg">
                <Icon className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">{finding.title}</h2>
                <p className="text-sm text-zinc-500">
                  @{finding.socialMediaSource?.handle || 'unknown'} on {platform}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* Severity */}
          <div className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4',
            finding.severity === 'critical' && 'bg-red-500/20 text-red-400',
            finding.severity === 'high' && 'bg-orange-500/20 text-orange-400',
            finding.severity === 'medium' && 'bg-yellow-500/20 text-yellow-400',
            finding.severity === 'low' && 'bg-green-500/20 text-green-400'
          )}>
            <span className={cn('w-2 h-2 rounded-full', severityColors[finding.severity])} />
            <span className="text-sm font-medium uppercase">{finding.severity} Risk</span>
          </div>

          {/* Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
              Summary
            </h3>
            <p className="text-zinc-300 leading-relaxed">{finding.summary}</p>
          </div>

          {/* Source */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <div className="text-sm text-zinc-500">
              {finding.source.publishedDate && (
                <span>Published: {new Date(finding.source.publishedDate).toLocaleDateString()}</span>
              )}
            </div>
            <a
              href={finding.source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              View Source
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
