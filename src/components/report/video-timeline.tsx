'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { Play, Pause, Tag, AlertTriangle, Eye, ZoomIn, ZoomOut, RotateCcw, Volume2, Skull, Wine, Flame, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisualAnalysisData, LogoDetection, TranscriptSegment } from '@/types';
import type { FlagEvidence, FlagCategory, FlagSeverity } from '@/types/video-analysis';

interface TimelineMarker {
  id: string;
  startTime: number;
  endTime: number;
  type: 'brand' | 'concern' | 'text' | 'flag';
  label: string;
  color: string;
  prominence?: 'primary' | 'secondary' | 'background';
  confidence?: number;
  severity?: FlagSeverity;
  category?: FlagCategory;
}

interface VideoTimelineProps {
  analysis: VisualAnalysisData;
  /** Flag evidence for safety markers */
  evidence?: FlagEvidence[];
  duration?: number;
  currentTime?: number;
  isPlaying?: boolean;
  className?: string;
  onSeek?: (time: number) => void;
  onTogglePlay?: () => void;
  /** Callback when a flag marker is clicked */
  onFlagClick?: (evidence: FlagEvidence) => void;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get color for flag category
 */
function getFlagCategoryColor(category: FlagCategory, severity: FlagSeverity): string {
  // High severity always red
  if (severity === 'high') return 'bg-red-500';

  // Category-based colors for medium/low
  const categoryColors: Record<FlagCategory, string> = {
    profanity: 'bg-red-400',
    violence: 'bg-orange-500',
    adult: 'bg-pink-500',
    substances: 'bg-purple-500',
    controversial: 'bg-amber-500',
    dangerous: 'bg-red-400',
    political: 'bg-blue-500',
    competitor: 'bg-rose-500',
    sponsor: 'bg-emerald-500',
  };
  return categoryColors[category] || 'bg-amber-500';
}

/**
 * Get icon for flag category
 */
function getFlagCategoryIcon(category: FlagCategory) {
  switch (category) {
    case 'profanity':
      return Volume2;
    case 'violence':
    case 'dangerous':
      return Skull;
    case 'substances':
      return Wine;
    case 'competitor':
    case 'sponsor':
      return Tag;
    default:
      return Flag;
  }
}

export function VideoTimeline({
  analysis,
  evidence,
  duration: propDuration,
  currentTime = 0,
  isPlaying = false,
  className,
  onSeek,
  onTogglePlay,
  onFlagClick
}: VideoTimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredMarker, setHoveredMarker] = useState<TimelineMarker | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Use video duration from analysis if available
  const duration = propDuration || analysis.videoDuration || 60;

  // Generate timeline markers from analysis data
  // Prioritize actual timestamps from logoDetections if available
  const markers = useMemo(() => {
    const result: TimelineMarker[] = [];

    // Add flag evidence markers (highest priority - shown on top)
    if (evidence && evidence.length > 0) {
      evidence.forEach((flag, index) => {
        result.push({
          id: `flag-${flag.category}-${flag.timestamp}-${index}`,
          startTime: flag.timestamp,
          endTime: flag.endTimestamp ?? flag.timestamp + 2,
          type: 'flag',
          label: flag.quote || flag.description,
          color: getFlagCategoryColor(flag.category, flag.severity),
          severity: flag.severity,
          category: flag.category,
        });
      });
    }

    // Add brand detection markers
    if (analysis.logoDetections && analysis.logoDetections.length > 0) {
      // Use actual timestamps from logo detections
      analysis.logoDetections.forEach((logo) => {
        logo.appearances.forEach((appearance, appIndex) => {
          result.push({
            id: `brand-${logo.brand}-${appIndex}`,
            startTime: appearance.startTime,
            endTime: appearance.endTime,
            type: 'brand',
            label: logo.brand,
            color: logo.likelySponsor ? 'bg-purple-500' : 'bg-purple-400',
            prominence: appearance.prominence,
            confidence: appearance.confidence,
          });
        });
      });
    } else {
      // Fallback to estimated positions for legacy data
      analysis.brands.forEach((brand, index) => {
        const position = 10 + (index * 20) % 80;
        const startTime = (position / 100) * duration;
        result.push({
          id: `brand-${brand.brand}-${index}`,
          startTime,
          endTime: startTime + 2,
          type: 'brand',
          label: brand.brand,
          color: 'bg-purple-500',
        });
      });
    }

    // Add text detection markers
    if (analysis.textInVideo) {
      analysis.textInVideo.forEach((text, index) => {
        const startTime = text.startTime ?? ((15 + (index * 25) % 70) / 100) * duration;
        const endTime = text.endTime ?? startTime + 3;
        result.push({
          id: `text-${index}`,
          startTime,
          endTime,
          type: 'text',
          label: text.text.slice(0, 30) + (text.text.length > 30 ? '...' : ''),
          color: 'bg-cyan-500',
        });
      });
    }

    // Add concern markers (skip if we have evidence - they're redundant)
    if (analysis.sceneContext?.concerns && (!evidence || evidence.length === 0)) {
      analysis.sceneContext.concerns.forEach((concern, index) => {
        const startTime = ((30 + (index * 30) % 60) / 100) * duration;
        result.push({
          id: `concern-${index}`,
          startTime,
          endTime: startTime + 5,
          type: 'concern',
          label: concern,
          color: 'bg-amber-500',
        });
      });
    }

    return result.sort((a, b) => a.startTime - b.startTime);
  }, [analysis, evidence, duration]);

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;
    onSeek(Math.max(0, Math.min(duration, time)));
  }, [duration, onSeek]);

  // Handle marker click
  const handleMarkerClick = useCallback((marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();

    // If it's a flag marker with a callback, let onFlagClick handle the seek
    if (marker.type === 'flag' && onFlagClick && evidence) {
      const matchingEvidence = evidence.find(
        ev => ev.category === marker.category && ev.timestamp === marker.startTime
      );
      if (matchingEvidence) {
        onFlagClick(matchingEvidence);  // This triggers handleFlagClick which seeks
        return;  // Don't also call onSeek
      }
    }

    // For non-flag markers or when no matching evidence, call onSeek directly
    onSeek?.(marker.startTime);
  }, [onSeek, onFlagClick, evidence]);

  // Calculate position percentage
  const getPositionPercent = (time: number) => (time / duration) * 100;

  // Calculate visible range based on zoom
  const visibleDuration = duration / zoom;
  const scrollOffset = Math.max(0, currentTime - visibleDuration / 2);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onTogglePlay && (
            <button
              onClick={onTogglePlay}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
            >
              {isPlaying ? (
                <Pause size={14} className="text-zinc-400" />
              ) : (
                <Play size={14} className="text-zinc-400" />
              )}
            </button>
          )}
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Video Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(Math.min(zoom * 1.5, 4))}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={12} className="text-zinc-500" />
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom / 1.5, 1))}
              className="p-1 hover:bg-zinc-800 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={12} className="text-zinc-500" />
            </button>
            {zoom > 1 && (
              <button
                onClick={() => setZoom(1)}
                className="p-1 hover:bg-zinc-800 rounded transition-colors"
                title="Reset zoom"
              >
                <RotateCcw size={12} className="text-zinc-500" />
              </button>
            )}
          </div>
          <span className="text-xs text-zinc-600">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        <div
          ref={timelineRef}
          className={cn(
            'h-12 bg-zinc-800/50 rounded-lg relative',
            onSeek && 'cursor-pointer'
          )}
          onClick={handleTimelineClick}
        >
          {/* Time grid markers */}
          <div className="absolute inset-0">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute top-0 bottom-0 w-px bg-zinc-700/50"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {/* Brand appearance ranges (background spans) */}
          {markers
            .filter(m => m.type === 'brand' && m.endTime > m.startTime)
            .map((marker) => (
              <div
                key={`range-${marker.id}`}
                className={cn(
                  'absolute top-0 bottom-0 opacity-20',
                  marker.prominence === 'primary' ? 'bg-emerald-500' :
                  marker.prominence === 'secondary' ? 'bg-amber-500' :
                  'bg-purple-500'
                )}
                style={{
                  left: `${getPositionPercent(marker.startTime)}%`,
                  width: `${getPositionPercent(marker.endTime - marker.startTime)}%`,
                }}
              />
            ))}

          {/* Detection markers */}
          {markers.map((marker) => {
            const leftPercent = getPositionPercent(marker.startTime);
            const isHovered = hoveredMarker?.id === marker.id;

            return (
              <div
                key={marker.id}
                className="absolute top-1/2 -translate-y-1/2 group z-10"
                style={{ left: `${leftPercent}%` }}
                onMouseEnter={() => setHoveredMarker(marker)}
                onMouseLeave={() => setHoveredMarker(null)}
                onClick={(e) => handleMarkerClick(marker, e)}
              >
                {/* Marker dot */}
                <div
                  className={cn(
                    'w-3 h-3 rounded-full cursor-pointer transition-all shadow-lg',
                    'ring-2 ring-zinc-900',
                    marker.color,
                    isHovered && 'scale-150 ring-4',
                    marker.prominence === 'primary' && 'w-4 h-4'
                  )}
                />

                {/* Tooltip */}
                <div className={cn(
                  'absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-2',
                  'bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl',
                  'text-xs text-zinc-300 z-50 max-w-[200px]',
                  'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {marker.type === 'brand' && <Tag size={12} className="text-purple-400" />}
                    {marker.type === 'concern' && <AlertTriangle size={12} className="text-amber-400" />}
                    {marker.type === 'text' && <Eye size={12} className="text-cyan-400" />}
                    {marker.type === 'flag' && (() => {
                      const FlagIcon = getFlagCategoryIcon(marker.category!);
                      const severityColor = marker.severity === 'high' ? 'text-red-400' : marker.severity === 'medium' ? 'text-amber-400' : 'text-yellow-400';
                      return <FlagIcon size={12} className={severityColor} />;
                    })()}
                    <span className="font-medium truncate">
                      {marker.type === 'flag' ? marker.category?.toUpperCase() : marker.label}
                    </span>
                  </div>
                  {marker.type === 'flag' && marker.label && (
                    <p className="text-[10px] text-zinc-400 mb-1 line-clamp-2 italic">
                      "{marker.label}"
                    </p>
                  )}
                  <div className="text-[10px] text-zinc-500 space-y-0.5">
                    <div>{formatTime(marker.startTime)}{marker.endTime > marker.startTime + 1 ? ` - ${formatTime(marker.endTime)}` : ''}</div>
                    {marker.type === 'flag' && marker.severity && (
                      <div className={cn(
                        'uppercase font-medium',
                        marker.severity === 'high' && 'text-red-400',
                        marker.severity === 'medium' && 'text-amber-400',
                        marker.severity === 'low' && 'text-yellow-400'
                      )}>
                        {marker.severity} severity
                      </div>
                    )}
                    {marker.prominence && (
                      <div className="capitalize">{marker.prominence} placement</div>
                    )}
                    {marker.confidence !== undefined && (
                      <div>{Math.round(marker.confidence * 100)}% confidence</div>
                    )}
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-zinc-700" />
                </div>
              </div>
            );
          })}

          {/* Current playback position */}
          {currentTime > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-20 pointer-events-none"
              style={{ left: `${getPositionPercent(currentTime)}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg" />
            </div>
          )}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-zinc-600">0:00</span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] text-zinc-600">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1 flex-wrap">
        {markers.some(m => m.type === 'flag' && m.severity === 'high') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-zinc-500">High Risk</span>
          </div>
        )}
        {markers.some(m => m.type === 'flag' && m.severity === 'medium') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-zinc-500">Medium Risk</span>
          </div>
        )}
        {markers.some(m => m.type === 'flag' && m.severity === 'low') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-[10px] text-zinc-500">Low Risk</span>
          </div>
        )}
        {markers.some(m => m.type === 'brand') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[10px] text-zinc-500">Brands</span>
          </div>
        )}
        {markers.some(m => m.type === 'text') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500" />
            <span className="text-[10px] text-zinc-500">Text</span>
          </div>
        )}
        {markers.some(m => m.type === 'concern') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-zinc-500">Concerns</span>
          </div>
        )}
        {markers.some(m => m.prominence === 'primary') && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-500">Primary</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact inline version for lists
export function VideoTimelineCompact({
  analysis,
  className
}: {
  analysis: VisualAnalysisData;
  className?: string;
}) {
  const hasBrands = analysis.brands.length > 0 || (analysis.logoDetections && analysis.logoDetections.length > 0);
  const hasText = analysis.textInVideo.length > 0;
  const hasConcerns = analysis.sceneContext.concerns.length > 0;
  const hasContent = hasBrands || hasText || hasConcerns;

  if (!hasContent) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="w-16 h-1 bg-zinc-800 rounded-full flex overflow-hidden">
        {hasBrands && (
          <div className="flex-1 bg-purple-500" />
        )}
        {hasText && (
          <div className="flex-1 bg-cyan-500" />
        )}
        {hasConcerns && (
          <div className="flex-1 bg-amber-500" />
        )}
      </div>
    </div>
  );
}
