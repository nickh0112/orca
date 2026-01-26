'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  AlertCircle,
  Tag,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { cn, getProxiedMediaUrl } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { VisualAnalysisData, LogoDetection, TranscriptSegment } from '@/types';

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  analysis?: VisualAnalysisData;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
  onSeeked?: () => void;
  externalCurrentTime?: number;
  /** Seek request with unique ID to ensure seeking works even for same timestamp */
  seekRequest?: { time: number; id: number } | null;
  fallbackUrl?: string;
  /** When true, hide the built-in control bar (use VideoTimeline as the controller) */
  hideControls?: boolean;
  /** External control for play state - when changed, will play/pause the video */
  externalIsPlaying?: boolean;
}

interface ActiveOverlay {
  id: string;
  type: 'brand' | 'concern' | 'text';
  label: string;
  prominence?: 'primary' | 'secondary' | 'background';
  likelySponsor?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function VideoPlayer({
  src,
  poster,
  analysis,
  className,
  onTimeUpdate,
  onDurationChange,
  onPlayStateChange,
  onSeeked,
  externalCurrentTime,
  seekRequest,
  fallbackUrl,
  hideControls = false,
  externalIsPlaying
}: VideoPlayerProps) {
  const t = useTranslations('creatorReport.videoPlayer');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlay[]>([]);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSeekRef = useRef<{ time: number; id: number } | null>(null);
  const canPlayListenerRef = useRef<(() => void) | null>(null);

  // Calculate active overlays based on current time
  useEffect(() => {
    if (!analysis) return;

    const overlays: ActiveOverlay[] = [];

    // Check logo detections
    if (analysis.logoDetections) {
      analysis.logoDetections.forEach(logo => {
        logo.appearances.forEach((appearance, idx) => {
          if (currentTime >= appearance.startTime && currentTime <= appearance.endTime) {
            overlays.push({
              id: `brand-${logo.brand}-${idx}`,
              type: 'brand',
              label: logo.brand,
              prominence: appearance.prominence,
              likelySponsor: logo.likelySponsor,
            });
          }
        });
      });
    }

    // Check text in video (if timestamps available)
    if (analysis.textInVideo) {
      analysis.textInVideo.forEach((text, idx) => {
        if (text.startTime !== undefined && text.endTime !== undefined) {
          if (currentTime >= text.startTime && currentTime <= text.endTime) {
            overlays.push({
              id: `text-${idx}`,
              type: 'text',
              label: text.text.slice(0, 50),
            });
          }
        }
      });
    }

    setActiveOverlays(overlays);
  }, [currentTime, analysis]);

  // Helper to seek with video readiness checks
  const seekTo = useCallback((time: number, requestId: number) => {
    const video = videoRef.current;
    if (!video) return;

    console.debug('[VideoPlayer] seekTo called', { time, requestId, readyState: video.readyState });

    // Store this as the pending seek (cancels any previous pending seek)
    pendingSeekRef.current = { time, id: requestId };

    // Clean up any existing canplay listener
    if (canPlayListenerRef.current) {
      video.removeEventListener('canplay', canPlayListenerRef.current);
      canPlayListenerRef.current = null;
    }

    const performSeek = () => {
      // Only proceed if this is still the active seek request
      if (pendingSeekRef.current?.id !== requestId) return;

      console.debug('[VideoPlayer] Performing seek', { time, readyState: video.readyState });
      video.currentTime = time;
      pendingSeekRef.current = null;
    };

    // If video has enough data (HAVE_FUTURE_DATA or better), seek immediately
    if (video.readyState >= 3) {
      performSeek();
      return;
    }

    // Set up timeout to attempt seek anyway after 5 seconds
    const timeoutId = setTimeout(() => {
      if (canPlayListenerRef.current) {
        video.removeEventListener('canplay', canPlayListenerRef.current);
        canPlayListenerRef.current = null;
      }
      if (pendingSeekRef.current?.id === requestId) {
        console.warn('[VideoPlayer] Seek timeout - attempting seek anyway', { time, readyState: video.readyState });
        video.currentTime = time;
        pendingSeekRef.current = null;
      }
    }, 5000);

    // Otherwise wait for canplay event
    const handleCanPlay = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('canplay', handleCanPlay);
      canPlayListenerRef.current = null;
      performSeek();
    };

    canPlayListenerRef.current = handleCanPlay;
    video.addEventListener('canplay', handleCanPlay);
  }, []);

  // Handle external seek requests - depends on ID to always trigger even for same time
  useEffect(() => {
    if (seekRequest) {
      seekTo(seekRequest.time, seekRequest.id);
    }
  }, [seekRequest?.id, seekTo]);

  // Cleanup pending seek listeners on unmount
  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && canPlayListenerRef.current) {
        video.removeEventListener('canplay', canPlayListenerRef.current);
      }
    };
  }, []);

  // Handle external play/pause control
  useEffect(() => {
    if (externalIsPlaying === undefined || !videoRef.current) return;
    if (externalIsPlaying && !isPlaying) {
      videoRef.current.play();
    } else if (!externalIsPlaying && isPlaying) {
      videoRef.current.pause();
    }
  }, [externalIsPlaying, isPlaying]);

  // Video event handlers
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  const handleDurationChange = useCallback(() => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    setDuration(dur);
    onDurationChange?.(dur);
  }, [onDurationChange]);

  const handleProgress = useCallback(() => {
    if (!videoRef.current) return;
    const bufferedRanges = videoRef.current.buffered;
    if (bufferedRanges.length > 0) {
      setBuffered(bufferedRanges.end(bufferedRanges.length - 1));
    }
  }, []);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlayStateChange?.(true);
  }, [onPlayStateChange]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  const handleError = useCallback(() => {
    setError(t('loadError'));
    setIsLoading(false);
  }, [t]);

  const handleLoadedData = useCallback(() => {
    const video = videoRef.current;
    console.debug('[VideoPlayer] loadeddata', {
      readyState: video?.readyState,
      duration: video?.duration,
      src: video?.src?.slice(0, 100)
    });
    setIsLoading(false);
    setError(null);
  }, []);

  // Debug: Log seeking events
  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    console.debug('[VideoPlayer] seeking', {
      currentTime: video?.currentTime,
      readyState: video?.readyState
    });
  }, []);

  const handleSeekedInternal = useCallback(() => {
    const video = videoRef.current;
    console.debug('[VideoPlayer] seeked', {
      currentTime: video?.currentTime,
      readyState: video?.readyState
    });
    onSeeked?.();
  }, [onSeeked]);

  // Control handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isFullscreen]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percentage * duration;
  }, [duration]);

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // No video source
  if (!src) {
    return (
      <div className={cn(
        'relative aspect-video bg-zinc-900 rounded-lg flex items-center justify-center',
        className
      )}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">{t('videoUnavailable')}</p>
          {fallbackUrl && (
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              View on platform
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-video bg-black rounded-lg overflow-hidden group',
        className
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onProgress={handleProgress}
        onPlay={handlePlay}
        onPause={handlePause}
        onError={handleError}
        onLoadedData={handleLoadedData}
        onSeeking={handleSeeking}
        onSeeked={handleSeekedInternal}
        playsInline
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-zinc-900/80 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-zinc-900/90 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm">{error}</p>
            {fallbackUrl && (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                View on platform
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Active Overlays */}
      {activeOverlays.length > 0 && (
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 pointer-events-none">
          {activeOverlays.map(overlay => (
            <div
              key={overlay.id}
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5',
                'backdrop-blur-sm shadow-lg animate-in fade-in duration-200',
                overlay.type === 'brand' && (
                  overlay.likelySponsor
                    ? 'bg-purple-500/90 text-white'
                    : 'bg-purple-500/70 text-white'
                ),
                overlay.type === 'text' && 'bg-cyan-500/70 text-white',
                overlay.type === 'concern' && 'bg-amber-500/70 text-zinc-900',
                overlay.prominence === 'primary' && 'ring-2 ring-white/50'
              )}
            >
              {overlay.type === 'brand' && <Tag className="w-3 h-3" />}
              {overlay.type === 'concern' && <AlertTriangle className="w-3 h-3" />}
              <span>{overlay.label}</span>
              {overlay.likelySponsor && (
                <span className="text-[10px] opacity-75">SPONSOR</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Controls Overlay - hidden when hideControls is true */}
      {!hideControls && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent',
            'transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Progress Bar */}
          <div
            className="px-4 py-2 cursor-pointer group/progress"
            onClick={handleSeek}
          >
            <div className="h-1 bg-zinc-700 rounded-full relative overflow-hidden group-hover/progress:h-2 transition-all">
              {/* Buffered */}
              <div
                className="absolute inset-y-0 left-0 bg-zinc-600 rounded-full"
                style={{ width: `${(buffered / duration) * 100}%` }}
              />
              {/* Progress */}
              <div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              {/* Scrubber */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title={isPlaying ? t('pause') : t('play')}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Volume */}
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title={isMuted ? t('unmute') : t('mute')}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Time */}
              <span className="text-xs text-white/80 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Active detection count */}
              {activeOverlays.length > 0 && (
                <span className="px-2 py-0.5 bg-purple-500/50 rounded text-xs text-white">
                  {activeOverlays.length} active
                </span>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                title={isFullscreen ? t('exitFullscreen') : t('fullscreen')}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click to play overlay (when paused) */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="w-8 h-8 text-zinc-900 ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}

// Simplified video thumbnail that can expand to full player
export function VideoThumbnail({
  src,
  poster,
  className,
  onClick
}: {
  src?: string;
  poster?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative aspect-video bg-zinc-900 rounded-lg overflow-hidden group',
        className
      )}
    >
      {poster ? (
        <img
          src={getProxiedMediaUrl(poster)}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-6 h-6 text-zinc-900 ml-0.5" />
        </div>
      </div>

      {/* Video indicator */}
      {src && (
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
          VIDEO
        </div>
      )}
    </button>
  );
}
