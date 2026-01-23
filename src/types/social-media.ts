import type { VisualAnalysis } from './video-analysis';

// Platform-specific post types from API responses

export interface InstagramPost {
  id: string;
  caption: string;
  comments_count: number;
  like_count: number;
  media_product_type: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
}

export interface TikTokPost {
  video_id: string;
  caption: string;
  video_views: number;
  likes: number;
  comments: number;
  shares: number;
  create_time: number;
  embed_url: string;
  thumbnail_url?: string;
  display_name?: string;
}

export interface YouTubeVideo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  tags?: string[];
  categoryId?: string;
}

// Unified types for internal use

export type MediaType = 'image' | 'video' | 'carousel';

export interface SocialMediaPost {
  id: string;
  caption: string;
  transcript?: string;  // Speech-to-text transcript (YouTube, TikTok)
  permalink: string;
  timestamp: string;
  engagement: {
    likes?: number;
    comments?: number;
    views?: number;
    shares?: number;
  };
  mediaUrl?: string;       // Direct image/video URL
  thumbnailUrl?: string;   // Thumbnail for videos
  mediaType?: MediaType;
  visualAnalysis?: VisualAnalysis;  // Twelve Labs visual analysis (brands, actions, text, scene context)
}

// Brand detection types

export interface BrandMention {
  brand: string;
  context: string;
  isSponsored: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface BrandDetectionResult {
  isAd: boolean;
  adIndicators: string[];
  brands: BrandMention[];
  summary: string;
}

// Brand partnership types for comprehensive brand history

export type PartnershipType = 'sponsored' | 'gifted' | 'affiliate' | 'organic_mention';

export interface BrandPartnership {
  brand: string;
  postId: string;
  postDate: string;
  permalink: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  partnershipType: PartnershipType;
  indicators: string[];  // e.g., ['#ad', 'use code']
  confidence: 'high' | 'medium' | 'low';
  context: string;  // Relevant quote from post
  thumbnailUrl?: string;
  isCompetitor?: boolean;  // Set during competitor detection
}

export interface BrandPartnershipReport {
  totalPartnerships: number;
  uniqueBrands: string[];
  timeline: BrandPartnership[];
  byBrand: Record<string, BrandPartnership[]>;
  byPlatform: Record<string, BrandPartnership[]>;
  competitorPartnerships: BrandPartnership[];
}

// Keyword detection types

export interface KeywordMatch {
  keyword: string;
  matchType: 'exact' | 'stem' | 'semantic';
  matchedText: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface KeywordDetectionResult {
  matches: KeywordMatch[];
  flaggedTerms: string[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface SocialMediaContent {
  platform: 'instagram' | 'tiktok' | 'youtube';
  handle: string;
  posts: SocialMediaPost[];
  fetchedAt: string;
  error?: string;
}

// Analysis types

export interface FlaggedPost {
  postId: string;
  caption: string;
  permalink: string;
  timestamp: string;
  concerns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  mediaType?: MediaType;
  visualAnalysis?: VisualAnalysis;
}

export interface SocialMediaAnalysis {
  platform: 'instagram' | 'tiktok' | 'youtube';
  handle: string;
  flaggedPosts: FlaggedPost[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

// API response types

export interface InstagramGraphResponse {
  business_discovery?: {
    name?: string;
    followers_count?: number;
    biography?: string;
    follows_count?: number;
    media?: {
      data?: InstagramPost[];
      paging?: {
        cursors?: {
          before?: string;
          after?: string;
        };
        next?: string;
      };
    };
  };
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

export interface TikTokAPIResponse {
  code: number;
  message: string;
  data?: {
    posts: Array<{
      video_id: string;
      caption: string;
      video_views: number;
      likes: number;
      comments: number;
      shares: number;
      create_time: number;
      embed_url: string;
      media_url?: string;  // Direct video URL (if available)
      thumbnail_url?: string;
      display_name?: string;
    }>;
    page_info: {
      has_more: boolean;
      cursor?: string;
    };
  };
}

export interface YouTubeSearchResponse {
  items?: Array<{
    id: {
      kind: string;
      videoId?: string;
      channelId?: string;
    };
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      channelTitle: string;
    };
  }>;
  nextPageToken?: string;
  pageInfo?: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface YouTubeVideoResponse {
  items?: Array<{
    id: string;
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      channelTitle: string;
      tags?: string[];
      categoryId?: string;
    };
  }>;
}
