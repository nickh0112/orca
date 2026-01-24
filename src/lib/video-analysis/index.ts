/**
 * Video Analysis Module
 *
 * Provides media understanding capabilities:
 * - Video analysis via Twelve Labs
 * - Image analysis via Claude Vision
 * - Batch processing with job queue
 * - Progress tracking and retry logic
 *
 * Features:
 * - Transcription (speech-to-text)
 * - Visual content analysis
 * - Brand/logo detection
 * - Content classification
 * - Action recognition
 * - On-screen text reading
 */

// Video analysis (Twelve Labs)
export {
  analyzeVideo,
  analyzeVideos,
  analyzeVideoWithOptions,
  isTwelveLabsConfigured,
  formatVisualAnalysisForPrompt,
  detectAllLogos,
  classifyContent,
  formatLogoDetections,
  formatContentClassification,
} from './twelve-labs';

// Image analysis (Claude Vision)
export {
  analyzeImage,
  analyzeImages,
  isClaudeVisionConfigured,
} from './image-analysis';

// Media queue for batch processing
export {
  MediaAnalysisQueue,
  createMediaQueue,
  processMediaBatch,
} from './media-queue';

// Unified media analyzer
export {
  analyzeAllMedia,
  analyzeMediaAutoDetect,
  analyzeSingleMedia,
  detectMediaType,
  detectMediaTypeFromBuffer,
  isMediaAnalysisAvailable,
  getAnalysisSummary,
} from './media-analyzer';

// Thumbnail pre-screening for cost optimization
export {
  preScreenThumbnail,
  preScreenBatch,
  filterForFullAnalysis,
  getRecommendedTier,
  isPreScreeningConfigured,
} from './thumbnail-prescreener';
export type { PreScreenResult, AnalysisTier } from './thumbnail-prescreener';

// Types
export type {
  VisualAnalysis,
  VideoAnalysisResult,
  TwelveLabsIndexResult,
  TwelveLabsTranscript,
  BrandDetection,
  ActionDetection,
  TextDetection,
  SceneContext,
  LogoDetection,
  ContentClassification,
  MediaItem,
  MediaAnalysisResult,
  MediaQueueOptions,
  ProgressCallback,
  MediaType,
  ImageAnalysisOptions,
  VideoAnalysisOptions,
} from '@/types/video-analysis';
