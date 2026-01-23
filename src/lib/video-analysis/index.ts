/**
 * Video Analysis Module
 *
 * Provides video understanding capabilities:
 * - Transcription (speech-to-text)
 * - Visual content analysis
 * - Brand/logo detection
 * - Action recognition
 * - On-screen text reading
 */

export {
  analyzeVideo,
  analyzeVideos,
  isTwelveLabsConfigured,
  formatVisualAnalysisForPrompt,
} from './twelve-labs';

export type {
  VisualAnalysis,
  VideoAnalysisResult,
  TwelveLabsIndexResult,
  TwelveLabsTranscript,
  BrandDetection,
  ActionDetection,
  TextDetection,
  SceneContext,
} from '@/types/video-analysis';
