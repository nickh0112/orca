'use client';

import { useMemo } from 'react';
import { Play, Tag, AlertTriangle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisualAnalysisData } from '@/types';

interface TimelineMarker {
  position: number; // 0-100 percent
  type: 'brand' | 'concern' | 'text';
  label: string;
  color: string;
}

interface VideoTimelineProps {
  analysis: VisualAnalysisData;
  duration?: number; // in seconds
  className?: string;
}

export function VideoTimeline({ analysis, duration = 60, className }: VideoTimelineProps) {
  // Generate timeline markers from analysis data
  const markers = useMemo(() => {
    const result: TimelineMarker[] = [];

    // Add brand detection markers
    analysis.brands.forEach((brand, index) => {
      result.push({
        position: 10 + (index * 20) % 80, // Distribute across timeline
        type: 'brand',
        label: brand.brand,
        color: 'bg-purple-500',
      });
    });

    // Add text detection markers
    analysis.textInVideo.forEach((text, index) => {
      result.push({
        position: 15 + (index * 25) % 70,
        type: 'text',
        label: text.text.slice(0, 20) + (text.text.length > 20 ? '...' : ''),
        color: 'bg-cyan-500',
      });
    });

    // Add concern markers
    analysis.sceneContext.concerns.forEach((concern, index) => {
      result.push({
        position: 30 + (index * 30) % 60,
        type: 'concern',
        label: concern,
        color: 'bg-amber-500',
      });
    });

    return result;
  }, [analysis]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Video Timeline</span>
        </div>
        <span className="text-xs text-zinc-600">{formatTime(duration)}</span>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-8 bg-zinc-800/50 rounded-lg relative overflow-hidden">
          {/* Time markers */}
          <div className="absolute inset-0 flex items-end pb-1">
            {[0, 25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute bottom-0 w-px h-2 bg-zinc-700"
                style={{ left: `${pct}%` }}
              />
            ))}
          </div>

          {/* Detection markers */}
          {markers.map((marker, index) => (
            <div
              key={index}
              className="absolute top-1/2 -translate-y-1/2 group"
              style={{ left: `${marker.position}%` }}
            >
              {/* Marker dot */}
              <div
                className={cn(
                  'w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-150',
                  marker.color
                )}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {marker.type === 'brand' && <Tag size={10} className="text-purple-400" />}
                  {marker.type === 'concern' && <AlertTriangle size={10} className="text-amber-400" />}
                  {marker.type === 'text' && <Eye size={10} className="text-cyan-400" />}
                  {marker.label}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-zinc-700" />
              </div>
            </div>
          ))}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1 px-0.5">
          <span className="text-[10px] text-zinc-600">0:00</span>
          <span className="text-[10px] text-zinc-600">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-1">
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
      </div>
    </div>
  );
}

// Compact inline version for lists
export function VideoTimelineCompact({ analysis, className }: { analysis: VisualAnalysisData; className?: string }) {
  const hasContent = analysis.brands.length > 0 ||
    analysis.textInVideo.length > 0 ||
    analysis.sceneContext.concerns.length > 0;

  if (!hasContent) return null;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="w-16 h-1 bg-zinc-800 rounded-full flex overflow-hidden">
        {analysis.brands.length > 0 && (
          <div className="flex-1 bg-purple-500" />
        )}
        {analysis.textInVideo.length > 0 && (
          <div className="flex-1 bg-cyan-500" />
        )}
        {analysis.sceneContext.concerns.length > 0 && (
          <div className="flex-1 bg-amber-500" />
        )}
      </div>
    </div>
  );
}
