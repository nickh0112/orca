// Types for Twelve Labs video analysis integration

export interface VisualAnalysis {
  description: string;
  brands: BrandDetection[];
  actions: ActionDetection[];
  textInVideo: TextDetection[];
  sceneContext: SceneContext;
  brandSafetyRating: 'safe' | 'caution' | 'unsafe';
  rawAnalysis?: string;
}

export interface BrandDetection {
  brand: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore?: number;       // 0-1 numeric score from logo detection
  startTime?: number;             // seconds
  endTime?: number;               // seconds
  framePercentage?: number;       // % of frame occupied by logo
  timestamp?: string;             // legacy field
  context: string;
  detectionMethod?: 'visual' | 'text' | 'audio';
  appearsSponsor?: boolean;       // appears to be sponsored content
  isCompetitor?: boolean;         // flagged by user or agent as competitor
}

// Logo detection from Search API - shows ALL detected brands with timestamps
export interface LogoDetection {
  brand: string;
  appearances: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    prominence?: 'primary' | 'secondary' | 'background';
  }>;
  totalDuration: number;          // Total seconds visible
  likelySponsor: boolean;         // Prominent placement suggests sponsorship
}

// Content classification from Classify API
export interface ContentClassification {
  labels: Array<{
    label: string;
    duration: number;
    confidence: number;
  }>;
  overallSafetyScore: number;     // 0-1 safety score
}

export interface ActionDetection {
  action: string;
  timestamp?: string;
  isConcerning: boolean;
  reason?: string;
}

export interface TextDetection {
  text: string;
  timestamp?: string;
  context: string;
}

export interface SceneContext {
  setting: string;
  mood: string;
  contentType: string;
  concerns: string[];
}

export interface TwelveLabsIndexResult {
  indexId: string;
  videoId: string;
  status: 'pending' | 'ready' | 'failed';
  duration?: number;
}

export interface TwelveLabsTranscript {
  text: string;
  segments?: TranscriptSegment[];
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface VideoAnalysisResult {
  transcript: TwelveLabsTranscript;
  visualAnalysis: VisualAnalysis;
  indexInfo: TwelveLabsIndexResult;
  logoDetections?: LogoDetection[];           // All detected logos from Search API
  contentClassification?: ContentClassification; // Content categories from Classify API
}

// Apify scraper result types

export interface ApifyTikTokPost {
  id: string;
  text: string;
  createTime: number;
  createTimeISO: string;
  authorMeta: {
    id: string;
    name: string;
    nickName: string;
    verified: boolean;
    signature?: string;
  };
  videoMeta: {
    duration: number;
    coverUrl: string;
    downloadUrl: string;
    playUrl: string;
  };
  diggCount: number;
  shareCount: number;
  playCount: number;
  commentCount: number;
  webVideoUrl: string;
  hashtags?: Array<{ name: string }>;
}

export interface ApifyInstagramPost {
  id: string;
  shortCode: string;
  caption: string;
  timestamp: string;
  displayUrl: string;
  videoUrl?: string;
  isVideo: boolean;
  likesCount: number;
  commentsCount: number;
  url: string;
  ownerUsername: string;
  hashtags?: string[];
  locationName?: string;
}

export interface ApifyScraperOptions {
  handle: string;
  monthsBack: number;
  maxPosts?: number;
  proxy?: {
    useApifyProxy: boolean;
    apifyProxyGroups?: string[];
  };
}

export interface ApifyRunResult<T> {
  items: T[];
  status: 'succeeded' | 'failed' | 'running';
  error?: string;
}

// Media analysis types for batch processing

export type MediaType = 'video' | 'image';

export interface MediaItem {
  id: string;
  type: MediaType;
  url: string;
  buffer?: Buffer;
}

export interface MediaAnalysisResult {
  type: MediaType;
  visualAnalysis: VisualAnalysis;
  transcript?: TwelveLabsTranscript;
  indexInfo?: TwelveLabsIndexResult;
  logoDetections?: LogoDetection[];
  contentClassification?: ContentClassification;
}

export interface MediaQueueOptions {
  videoConcurrency?: number;  // Default: 5
  imageConcurrency?: number;  // Default: 10
  retries?: number;           // Default: 3
  retryDelayMs?: number;      // Default: 1000
  onProgress?: ProgressCallback;
}

export type ProgressCallback = (
  completed: number,
  total: number,
  failed: number
) => void;

export interface ImageAnalysisOptions {
  concurrency?: number;
  onProgress?: ProgressCallback;
}

export interface VideoAnalysisOptions {
  concurrency?: number;
  skipLogoDetection?: boolean;
  skipClassification?: boolean;
  /** Analysis tier - overrides skip options */
  tier?: 'light' | 'standard' | 'full';
  onProgress?: ProgressCallback;
}

/**
 * Pre-screening result for thumbnail analysis
 */
export interface PreScreenResult {
  /** Whether this video needs full Twelve Labs analysis */
  needsFullAnalysis: boolean;
  /** Reason for the decision */
  reason: 'safe' | 'brands_detected' | 'uncertain' | 'concerning' | 'error';
  /** Brands detected in thumbnail (if any) */
  detectedBrands?: string[];
  /** Confidence in the pre-screen decision (0-1) */
  confidence: number;
  /** Brief description of thumbnail content */
  thumbnailDescription?: string;
}
