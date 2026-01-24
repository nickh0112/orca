/**
 * Unified Media Analyzer
 *
 * Provides a single interface for analyzing both videos and images:
 * - Auto-detects media type from URL or buffer
 * - Routes to appropriate analyzer (Twelve Labs or Claude Vision)
 * - Supports batch processing with progress tracking
 * - Returns consistent MediaAnalysisResult format
 *
 * This is the recommended entry point for media analysis.
 */

import {
  MediaItem,
  MediaAnalysisResult,
  MediaQueueOptions,
  ProgressCallback,
  MediaType,
} from '@/types/video-analysis';
import { MediaAnalysisQueue, createMediaQueue } from './media-queue';
import { isTwelveLabsConfigured } from './twelve-labs';
import { analyzeImage, isClaudeVisionConfigured } from './image-analysis';

// File extension to media type mapping
const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v', '.flv', '.wmv', '.3gp'
]);

const IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'
]);

/**
 * Detect media type from URL
 */
export function detectMediaType(url: string): MediaType | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();

    // Check file extension
    for (const ext of VIDEO_EXTENSIONS) {
      if (pathname.endsWith(ext)) return 'video';
    }

    for (const ext of IMAGE_EXTENSIONS) {
      if (pathname.endsWith(ext)) return 'image';
    }

    // Check common URL patterns
    if (pathname.includes('/video/') || pathname.includes('/videos/')) {
      return 'video';
    }

    if (pathname.includes('/image/') || pathname.includes('/images/') || pathname.includes('/photo/')) {
      return 'image';
    }

    // Check query params for type hints
    const params = urlObj.searchParams;
    const format = params.get('format') || params.get('type') || '';
    if (format.includes('video') || format.includes('mp4')) return 'video';
    if (format.includes('image') || format.includes('jpg') || format.includes('png')) return 'image';

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect media type from buffer magic bytes
 */
export function detectMediaTypeFromBuffer(buffer: Buffer): MediaType | null {
  if (buffer.length < 12) return null;

  // Check for common video magic bytes
  // MP4/MOV: ftyp at offset 4
  if (
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70    // p
  ) {
    return 'video';
  }

  // WebM: 0x1A 0x45 0xDF 0xA3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video';
  }

  // AVI: RIFF....AVI
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x41 && buffer[9] === 0x56 && buffer[10] === 0x49
  ) {
    return 'video';
  }

  // Check for common image magic bytes
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image';
  }

  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image';
  }

  return null;
}

/**
 * Check if media analysis is available
 */
export function isMediaAnalysisAvailable(): {
  video: boolean;
  image: boolean;
  any: boolean;
} {
  const video = isTwelveLabsConfigured();
  const image = isClaudeVisionConfigured();
  return { video, image, any: video || image };
}

/**
 * Analyze all media items (videos and images) with batch processing
 *
 * @param media - Array of media items with id, type, url, and optional buffer
 * @param options - Queue options for concurrency, retries, and progress tracking
 * @returns Map of media id to analysis result (null if failed)
 */
export async function analyzeAllMedia(
  media: Array<{
    id: string;
    type: MediaType;
    url: string;
    buffer?: Buffer;
  }>,
  options?: {
    videoConcurrency?: number;  // Default: 5
    imageConcurrency?: number;  // Default: 10
    retries?: number;           // Default: 3
    onProgress?: ProgressCallback;
  }
): Promise<Map<string, MediaAnalysisResult | null>> {
  if (media.length === 0) {
    return new Map();
  }

  // Convert to MediaItem array
  const mediaItems: MediaItem[] = media.map(m => ({
    id: m.id,
    type: m.type,
    url: m.url,
    buffer: m.buffer,
  }));

  // Create queue with options
  const queue = createMediaQueue({
    videoConcurrency: options?.videoConcurrency,
    imageConcurrency: options?.imageConcurrency,
    retries: options?.retries,
    onProgress: options?.onProgress,
  });

  return queue.processAll(mediaItems);
}

/**
 * Analyze media items with auto-detection of type
 * Use this when you have URLs but don't know the media type
 *
 * @param items - Array of items with id, url, and optional type hint
 * @param options - Queue options
 * @returns Map of item id to analysis result
 */
export async function analyzeMediaAutoDetect(
  items: Array<{
    id: string;
    url: string;
    buffer?: Buffer;
    typeHint?: MediaType;
  }>,
  options?: MediaQueueOptions
): Promise<Map<string, MediaAnalysisResult | null>> {
  // Detect media types
  const mediaItems: MediaItem[] = items.map(item => {
    let type: MediaType;

    // Use hint if provided
    if (item.typeHint) {
      type = item.typeHint;
    }
    // Try buffer detection
    else if (item.buffer) {
      type = detectMediaTypeFromBuffer(item.buffer) || 'image'; // Default to image
    }
    // Try URL detection
    else {
      type = detectMediaType(item.url) || 'image'; // Default to image
    }

    return {
      id: item.id,
      type,
      url: item.url,
      buffer: item.buffer,
    };
  });

  const queue = createMediaQueue(options);
  return queue.processAll(mediaItems);
}

/**
 * Analyze a single media item
 * Convenience function for analyzing one item without queue overhead
 */
export async function analyzeSingleMedia(
  url: string,
  type: MediaType,
  buffer?: Buffer
): Promise<MediaAnalysisResult | null> {
  const results = await analyzeAllMedia([
    { id: 'single', type, url, buffer }
  ]);

  return results.get('single') || null;
}

/**
 * Get analysis summary statistics
 */
export function getAnalysisSummary(
  results: Map<string, MediaAnalysisResult | null>
): {
  total: number;
  successful: number;
  failed: number;
  videos: number;
  images: number;
  brandsDetected: number;
  averageSafetyRating: string;
} {
  let successful = 0;
  let failed = 0;
  let videos = 0;
  let images = 0;
  let brandsDetected = 0;
  let safeCount = 0;
  let cautionCount = 0;
  let unsafeCount = 0;

  for (const result of results.values()) {
    if (result === null) {
      failed++;
      continue;
    }

    successful++;

    if (result.type === 'video') videos++;
    else images++;

    brandsDetected += result.visualAnalysis.brands.length;

    switch (result.visualAnalysis.brandSafetyRating) {
      case 'safe':
        safeCount++;
        break;
      case 'caution':
        cautionCount++;
        break;
      case 'unsafe':
        unsafeCount++;
        break;
    }
  }

  let averageSafetyRating = 'safe';
  if (successful > 0) {
    if (unsafeCount > 0) {
      averageSafetyRating = 'unsafe';
    } else if (cautionCount > safeCount) {
      averageSafetyRating = 'caution';
    }
  }

  return {
    total: results.size,
    successful,
    failed,
    videos,
    images,
    brandsDetected,
    averageSafetyRating,
  };
}
