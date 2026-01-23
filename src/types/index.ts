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

export interface VisualAnalysisData {
  description: string;
  brands: Array<{ brand: string; confidence: 'high' | 'medium' | 'low'; context: string }>;
  actions: Array<{ action: string; isConcerning: boolean; reason?: string }>;
  textInVideo: Array<{ text: string; context: string }>;
  sceneContext: {
    setting: string;
    mood: string;
    contentType: string;
    concerns: string[];
  };
  brandSafetyRating: 'safe' | 'caution' | 'unsafe';
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
