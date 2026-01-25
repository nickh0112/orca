export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CreatorStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type FindingType =
  | 'court_case'
  | 'news_article'
  | 'social_controversy'
  | 'social_post'           // Direct content from creator's social media
  | 'reddit_mention'        // Reddit discussion about creator
  | 'competitor_partnership' // Partnership with a competitor brand
  | 'other';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type PersonMatch = 'yes' | 'no' | 'uncertain';

export interface FindingValidation {
  isSamePerson: PersonMatch;
  confidence: ConfidenceLevel;
  reason?: string;
}

// Extended Twelve Labs data structures
export interface LogoDetection {
  brand: string;
  appearances: Array<{
    startTime: number;
    endTime: number;
    confidence: number;
    prominence?: 'primary' | 'secondary' | 'background';
  }>;
  totalDuration: number;
  likelySponsor: boolean;
}

/** Per-category score with explanation */
export interface CategoryScoreWithReason {
  score: number;               // 0-100
  reason: string;              // why this score
  evidenceCount?: number;      // how many instances
}

export interface ContentClassification {
  labels: Array<{
    label: string;
    duration: number;
    confidence: number;
  }>;
  overallSafetyScore: number;
  // Detailed safety scores by category (0-100 scale)
  categoryScores?: {
    brandSafety?: number | CategoryScoreWithReason;
    violence?: number | CategoryScoreWithReason;
    adultContent?: number | CategoryScoreWithReason;
    political?: number | CategoryScoreWithReason;
    substanceUse?: number | CategoryScoreWithReason;
    profanity?: number | CategoryScoreWithReason;
    dangerous?: number | CategoryScoreWithReason;
    controversial?: number | CategoryScoreWithReason;
  };
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface VisualAnalysisData {
  description: string;
  brands: Array<{ brand: string; confidence: 'high' | 'medium' | 'low'; context: string }>;
  actions: Array<{ action: string; isConcerning: boolean; reason?: string }>;
  textInVideo: Array<{ text: string; context: string; startTime?: number; endTime?: number }>;
  sceneContext: {
    setting: string;
    mood: string;
    contentType: string;
    concerns: string[];
  };
  brandSafetyRating: 'safe' | 'caution' | 'unsafe';
  // Extended Twelve Labs data
  logoDetections?: LogoDetection[];
  contentClassification?: ContentClassification;
  transcriptSegments?: TranscriptSegment[];
  videoDuration?: number;
  // Professional brand safety rationale with timestamped evidence
  safetyRationale?: {
    summary: string;
    evidence: Array<{
      category: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
      endTimestamp?: number;
      source: 'audio' | 'visual' | 'text' | 'transcript';
      quote?: string;
      description: string;
      context?: string;
    }>;
    categoryScores: {
      profanity: { score: number; reason: string; evidenceCount?: number };
      violence: { score: number; reason: string; evidenceCount?: number };
      adult: { score: number; reason: string; evidenceCount?: number };
      substances: { score: number; reason: string; evidenceCount?: number };
      controversial: { score: number; reason: string; evidenceCount?: number };
      dangerous: { score: number; reason: string; evidenceCount?: number };
      political: { score: number; reason: string; evidenceCount?: number };
    };
    coverageStats: {
      videoDuration: number;
      transcriptWords: number;
      framesAnalyzed: number;
    };
  };
}

export interface Finding {
  type: FindingType;
  title: string;
  summary: string;
  severity: Severity;
  source: {
    url: string;
    title: string;
    publishedDate?: string;
  };
  validation?: FindingValidation;
  socialMediaSource?: {
    platform: 'instagram' | 'tiktok' | 'youtube';
    handle: string;
    postId: string;
    engagement?: {
      likes?: number;
      comments?: number;
      views?: number;
      shares?: number;
    };
    mediaUrl?: string;
    thumbnailUrl?: string;
    mediaType?: 'image' | 'video' | 'carousel';
    visualAnalysis?: VisualAnalysisData;
  };
}

export interface CreatorResult {
  creatorId: string;
  name: string;
  riskLevel?: RiskLevel;
  findingsCount?: number;
  summary?: string;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface BatchWithCounts {
  id: string;
  name: string;
  status: BatchStatus;
  searchTerms: string | null;
  userEmail: string | null;
  clientName: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  _count: {
    creators: number;
  };
}

export interface CreatorWithReport {
  id: string;
  name: string;
  socialLinks: string;
  status: CreatorStatus;
  batchId: string;
  createdAt: Date;
  report?: {
    id: string;
    riskLevel: RiskLevel;
    summary: string | null;
    findings: string;
    createdAt: Date;
  } | null;
}
