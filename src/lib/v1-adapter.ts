/**
 * V1 API Adapter
 * Converts between Orca internal format and creator-vetting-ms API format
 */

import type { Creator, Report, Attachment, PlatformStatus } from '@prisma/client';
import type { BrandDetectionResult, KeywordDetectionResult } from '@/types/social-media';
import type { ProfanityResult } from './profanity';
import type { FlaggedTopicsResult } from './google-search';

// V1 API Request Types
export interface V1CreateReportRequest {
  creator_name: string;
  instagram_handle?: string;
  youtube_handle?: string;
  tiktok_handle?: string;
  language?: string;
  custom_keywords?: string[];
  brands?: string[];
  callback_url?: string;
}

// V1 API Response Types
export interface V1ReportStatusResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  instagram_status: V1PlatformStatus;
  youtube_status: V1PlatformStatus;
  tiktok_status: V1PlatformStatus;
  web_search_status: V1PlatformStatus;
  created_at: string;
  updated_at: string;
}

export type V1PlatformStatus = 'NOT_REQUESTED' | 'PENDING' | 'READY' | 'FAILED';

export interface V1VettedContent {
  url: string;
  content: string;
  keyword?: string;
  category: 'profanity' | 'brand' | 'custom_keyword';
}

export interface V1BrandResult {
  brand: string;
  counter: number;
  posts: Array<{ caption: string; description?: string }>;
  similar_words: string[];
}

export interface V1KeywordResult {
  keyword: string;
  counter: number;
  posts: Array<{ caption: string; description?: string }>;
  similar_words: string[];
}

export interface V1WebSearchResult {
  topic: string;
  vetted_contents: Array<{
    url: string;
    snippet: string;
    term: string;
  }>;
}

export interface V1FullReportResponse {
  id: string;
  creator_name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';

  // Per-platform status
  instagram_status: V1PlatformStatus;
  youtube_status: V1PlatformStatus;
  tiktok_status: V1PlatformStatus;
  web_search_status: V1PlatformStatus;

  // Results
  profanity: {
    has_profanity: boolean;
    max_severity: number;
    matches: Array<{
      word: string;
      severity: number;
      category: string;
    }>;
  };

  brands: {
    instagram: V1BrandResult[];
    youtube: V1BrandResult[];
    tiktok: V1BrandResult[];
  };

  keywords: {
    instagram: V1KeywordResult[];
    youtube: V1KeywordResult[];
    tiktok: V1KeywordResult[];
  };

  instagram_vetted_content: V1VettedContent[];
  youtube_vetted_content: V1VettedContent[];
  tiktok_vetted_content: V1VettedContent[];

  web_search: {
    flagged_topics: V1WebSearchResult[];
    summary: string;
  };

  // Orca enhancements (not in creator-vetting-ms)
  content_safety?: {
    flagged_posts: number;
    overall_risk: string;
    summary: string;
  };
  ai_summary?: string;

  created_at: string;
  completed_at: string | null;
}

/**
 * Convert Prisma PlatformStatus to V1 format
 */
export function convertPlatformStatus(status: PlatformStatus): V1PlatformStatus {
  switch (status) {
    case 'NOT_REQUESTED':
      return 'NOT_REQUESTED';
    case 'PENDING':
      return 'PENDING';
    case 'READY':
      return 'READY';
    case 'FAILED':
      return 'FAILED';
    default:
      return 'NOT_REQUESTED';
  }
}

/**
 * Convert Creator status to V1 status
 */
export function convertCreatorStatus(
  status: string
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' {
  switch (status) {
    case 'PENDING':
      return 'PENDING';
    case 'PROCESSING':
      return 'PROCESSING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/**
 * Convert Orca risk level to V1 format
 */
export function convertRiskLevel(
  riskLevel: string
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN' {
  const upper = riskLevel.toUpperCase();
  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(upper)) {
    return upper as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }
  return 'UNKNOWN';
}

/**
 * Parse attachment data from JSON string
 */
function parseAttachmentData<T>(data: string, defaultValue: T): T {
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Convert brand detection results to V1 format
 */
export function convertBrandResults(
  results: Map<string, BrandDetectionResult> | BrandDetectionResult[]
): V1BrandResult[] {
  const brandMap = new Map<string, V1BrandResult>();

  const resultArray = results instanceof Map ? Array.from(results.values()) : results;

  for (const result of resultArray) {
    for (const brand of result.brands) {
      const existing = brandMap.get(brand.brand.toLowerCase());
      if (existing) {
        existing.counter++;
        existing.posts.push({ caption: brand.context });
      } else {
        brandMap.set(brand.brand.toLowerCase(), {
          brand: brand.brand,
          counter: 1,
          posts: [{ caption: brand.context }],
          similar_words: [],
        });
      }
    }
  }

  return Array.from(brandMap.values());
}

/**
 * Convert keyword detection results to V1 format
 */
export function convertKeywordResults(
  results: Map<string, KeywordDetectionResult> | KeywordDetectionResult[]
): V1KeywordResult[] {
  const keywordMap = new Map<string, V1KeywordResult>();

  const resultArray = results instanceof Map ? Array.from(results.values()) : results;

  for (const result of resultArray) {
    for (const match of result.matches) {
      const existing = keywordMap.get(match.keyword.toLowerCase());
      if (existing) {
        existing.counter++;
      } else {
        keywordMap.set(match.keyword.toLowerCase(), {
          keyword: match.keyword,
          counter: 1,
          posts: [],
          similar_words: match.matchType === 'stem' ? [match.matchedText] : [],
        });
      }
    }
  }

  return Array.from(keywordMap.values());
}

/**
 * Convert web search results to V1 format
 */
export function convertWebSearchResults(
  results: FlaggedTopicsResult
): V1WebSearchResult[] {
  const topicMap = new Map<string, V1WebSearchResult>();

  for (const result of results.results) {
    const existing = topicMap.get(result.topic);
    if (existing) {
      existing.vetted_contents.push({
        url: result.url,
        snippet: result.snippet,
        term: result.topic,
      });
    } else {
      topicMap.set(result.topic, {
        topic: result.topic,
        vetted_contents: [
          {
            url: result.url,
            snippet: result.snippet,
            term: result.topic,
          },
        ],
      });
    }
  }

  return Array.from(topicMap.values());
}

/**
 * Build V1 status response from Creator
 */
export function buildStatusResponse(
  creator: Creator
): V1ReportStatusResponse {
  return {
    id: creator.id,
    status: convertCreatorStatus(creator.status),
    instagram_status: convertPlatformStatus(creator.instagramStatus),
    youtube_status: convertPlatformStatus(creator.youtubeStatus),
    tiktok_status: convertPlatformStatus(creator.tiktokStatus),
    web_search_status: convertPlatformStatus(creator.webSearchStatus),
    created_at: creator.createdAt.toISOString(),
    updated_at: creator.updatedAt.toISOString(),
  };
}

/**
 * Build full V1 report response from Creator, Report, and Attachments
 */
export function buildFullReportResponse(
  creator: Creator,
  report: Report | null,
  attachments: Attachment[]
): V1FullReportResponse {
  // Parse attachments
  const attachmentMap = new Map<string, string>();
  for (const att of attachments) {
    attachmentMap.set(att.type, att.data);
  }

  // Parse profanity from attachment
  const profanityData = attachmentMap.get('profanity')
    ? parseAttachmentData<ProfanityResult>(attachmentMap.get('profanity')!, {
        hasProfanity: false,
        maxSeverity: 0,
        severityLevel: 'none',
        matches: [],
        categories: [],
      })
    : null;

  // Parse brand results per platform
  const brandsInstagram = attachmentMap.get('brands-instagram')
    ? parseAttachmentData<V1BrandResult[]>(attachmentMap.get('brands-instagram')!, [])
    : [];
  const brandsYoutube = attachmentMap.get('brands-youtube')
    ? parseAttachmentData<V1BrandResult[]>(attachmentMap.get('brands-youtube')!, [])
    : [];
  const brandsTiktok = attachmentMap.get('brands-tiktok')
    ? parseAttachmentData<V1BrandResult[]>(attachmentMap.get('brands-tiktok')!, [])
    : [];

  // Parse keyword results per platform
  const keywordsInstagram = attachmentMap.get('keywords-instagram')
    ? parseAttachmentData<V1KeywordResult[]>(attachmentMap.get('keywords-instagram')!, [])
    : [];
  const keywordsYoutube = attachmentMap.get('keywords-youtube')
    ? parseAttachmentData<V1KeywordResult[]>(attachmentMap.get('keywords-youtube')!, [])
    : [];
  const keywordsTiktok = attachmentMap.get('keywords-tiktok')
    ? parseAttachmentData<V1KeywordResult[]>(attachmentMap.get('keywords-tiktok')!, [])
    : [];

  // Parse vetted content per platform
  const vettedInstagram = attachmentMap.get('vetted-instagram')
    ? parseAttachmentData<V1VettedContent[]>(attachmentMap.get('vetted-instagram')!, [])
    : [];
  const vettedYoutube = attachmentMap.get('vetted-youtube')
    ? parseAttachmentData<V1VettedContent[]>(attachmentMap.get('vetted-youtube')!, [])
    : [];
  const vettedTiktok = attachmentMap.get('vetted-tiktok')
    ? parseAttachmentData<V1VettedContent[]>(attachmentMap.get('vetted-tiktok')!, [])
    : [];

  // Parse web search results
  const webSearchData = attachmentMap.get('web-search')
    ? parseAttachmentData<{ results: V1WebSearchResult[]; summary: string }>(
        attachmentMap.get('web-search')!,
        { results: [], summary: '' }
      )
    : { results: [], summary: '' };

  // Parse findings for risk level
  const findings = report?.findings
    ? parseAttachmentData<{ severity: string }[]>(report.findings, [])
    : [];

  return {
    id: creator.id,
    creator_name: creator.name,
    status: convertCreatorStatus(creator.status),
    risk_level: report ? convertRiskLevel(report.riskLevel) : 'UNKNOWN',

    instagram_status: convertPlatformStatus(creator.instagramStatus),
    youtube_status: convertPlatformStatus(creator.youtubeStatus),
    tiktok_status: convertPlatformStatus(creator.tiktokStatus),
    web_search_status: convertPlatformStatus(creator.webSearchStatus),

    profanity: {
      has_profanity: profanityData?.hasProfanity ?? false,
      max_severity: profanityData?.maxSeverity ?? 0,
      matches:
        profanityData?.matches.map((m) => ({
          word: m.word,
          severity: m.severity,
          category: m.category,
        })) ?? [],
    },

    brands: {
      instagram: brandsInstagram,
      youtube: brandsYoutube,
      tiktok: brandsTiktok,
    },

    keywords: {
      instagram: keywordsInstagram,
      youtube: keywordsYoutube,
      tiktok: keywordsTiktok,
    },

    instagram_vetted_content: vettedInstagram,
    youtube_vetted_content: vettedYoutube,
    tiktok_vetted_content: vettedTiktok,

    web_search: {
      flagged_topics: webSearchData.results,
      summary: webSearchData.summary || report?.summary || '',
    },

    content_safety: report
      ? {
          flagged_posts: findings.length,
          overall_risk: report.riskLevel,
          summary: report.summary || '',
        }
      : undefined,

    ai_summary: report?.summary ?? undefined,

    created_at: creator.createdAt.toISOString(),
    completed_at: creator.status === 'COMPLETED' ? creator.updatedAt.toISOString() : null,
  };
}

/**
 * Validate V1 create report request
 */
export function validateCreateReportRequest(
  body: unknown
): { valid: true; data: V1CreateReportRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const data = body as Record<string, unknown>;

  if (!data.creator_name || typeof data.creator_name !== 'string') {
    return { valid: false, error: 'creator_name is required and must be a string' };
  }

  // At least one handle must be provided
  const hasHandle =
    (data.instagram_handle && typeof data.instagram_handle === 'string') ||
    (data.youtube_handle && typeof data.youtube_handle === 'string') ||
    (data.tiktok_handle && typeof data.tiktok_handle === 'string');

  if (!hasHandle) {
    return {
      valid: false,
      error: 'At least one social media handle (instagram_handle, youtube_handle, or tiktok_handle) is required',
    };
  }

  return {
    valid: true,
    data: {
      creator_name: data.creator_name as string,
      instagram_handle: data.instagram_handle as string | undefined,
      youtube_handle: data.youtube_handle as string | undefined,
      tiktok_handle: data.tiktok_handle as string | undefined,
      language: (data.language as string) || 'en',
      custom_keywords: Array.isArray(data.custom_keywords)
        ? (data.custom_keywords as string[])
        : undefined,
      brands: Array.isArray(data.brands) ? (data.brands as string[]) : undefined,
      callback_url: data.callback_url as string | undefined,
    },
  };
}
