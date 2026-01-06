export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
export type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type CreatorStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type FindingType = 'court_case' | 'news_article' | 'social_controversy' | 'other';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

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
