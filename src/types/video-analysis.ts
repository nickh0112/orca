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
  timestamp?: string;
  context: string;
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
