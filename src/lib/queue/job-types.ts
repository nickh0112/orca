/**
 * Job Type Definitions for BullMQ Queues
 *
 * Defines the structure of jobs for different queue types:
 * - Video analysis jobs
 * - Image analysis jobs
 * - Scraper jobs (Apify)
 * - Batch processing jobs
 */

import type { AnalysisTier } from '@/lib/video-analysis/twelve-labs';
import type { PreScreenResult } from '@/lib/video-analysis/thumbnail-prescreener';

/**
 * Queue names for different job types
 */
export const QUEUE_NAMES = {
  VIDEO_ANALYSIS: 'video-analysis',
  IMAGE_ANALYSIS: 'image-analysis',
  SCRAPER: 'scraper',
  BATCH_COORDINATOR: 'batch-coordinator',
  AD_FORMAT_ANALYSIS: 'ad-format-analysis',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Video analysis job data
 */
export interface VideoAnalysisJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID this job belongs to */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Post ID from social media */
  postId: string;
  /** Video URL to analyze */
  videoUrl: string;
  /** Pre-downloaded video buffer (base64 encoded) */
  videoBufferBase64?: string;
  /** Thumbnail URL for pre-screening */
  thumbnailUrl?: string;
  /** Analysis tier to use */
  tier?: AnalysisTier;
  /** Pre-screen result if already performed */
  preScreenResult?: PreScreenResult;
  /** Platform (instagram, tiktok, youtube) */
  platform: string;
  /** Handle of the creator */
  handle: string;
  /** Retry count */
  attempt?: number;
}

/**
 * Video analysis job result
 */
export interface VideoAnalysisJobResult {
  success: boolean;
  postId: string;
  creatorId: string;
  /** Transcript text */
  transcript?: string;
  /** Visual analysis results (serialized) */
  visualAnalysis?: string;
  /** Logo detections (serialized) */
  logoDetections?: string;
  /** Content classification (serialized) */
  contentClassification?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
  /** Tier used for analysis */
  tierUsed?: AnalysisTier;
}

/**
 * Image analysis job data
 */
export interface ImageAnalysisJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Post ID */
  postId: string;
  /** Image URL to analyze */
  imageUrl: string;
  /** Pre-downloaded image buffer (base64 encoded) */
  imageBufferBase64?: string;
  /** Platform */
  platform: string;
  /** Handle */
  handle: string;
  /** Retry count */
  attempt?: number;
}

/**
 * Image analysis job result
 */
export interface ImageAnalysisJobResult {
  success: boolean;
  postId: string;
  creatorId: string;
  /** Visual analysis results (serialized) */
  visualAnalysis?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
}

/**
 * Scraper job data (Apify)
 */
export interface ScraperJobData {
  /** Unique job identifier */
  jobId: string;
  /** Batch ID */
  batchId: string;
  /** Creator ID */
  creatorId: string;
  /** Platform to scrape */
  platform: 'instagram' | 'tiktok';
  /** Handle to scrape */
  handle: string;
  /** Months back to fetch */
  monthsBack: number;
  /** Max posts to fetch */
  maxPosts?: number;
  /** Retry count */
  attempt?: number;
}

/**
 * Scraper job result
 */
export interface ScraperJobResult {
  success: boolean;
  creatorId: string;
  platform: string;
  handle: string;
  /** Number of posts fetched */
  postCount?: number;
  /** Posts data (serialized) */
  postsData?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
}

/**
 * Batch coordinator job data
 */
export interface BatchCoordinatorJobData {
  /** Batch ID to process */
  batchId: string;
  /** Search terms for the batch */
  searchTerms?: string[];
  /** Creator IDs to process */
  creatorIds: string[];
}

/**
 * Batch coordinator job result
 */
export interface BatchCoordinatorJobResult {
  success: boolean;
  batchId: string;
  totalCreators: number;
  completedCreators: number;
  failedCreators: number;
  error?: string;
}

/**
 * Ad format analysis job data
 * Used for extracting ad creative format patterns from videos
 */
export interface AdFormatAnalysisJobData {
  /** Unique job identifier */
  jobId: string;
  /** Filename of the video */
  filename: string;
  /** Twelve Labs video ID */
  videoId: string;
  /** Twelve Labs index ID */
  indexId: string;
  /** Video duration in seconds */
  duration?: number;
  /** Retry count */
  attempt?: number;
}

/**
 * Scene analysis from ad format extraction
 */
export interface SceneAnalysis {
  sceneNumber: number;
  startTime: number;
  endTime: number;
  duration: number;
  purpose: 'hook' | 'problem' | 'solution' | 'social-proof' | 'cta' | 'transition' | 'product-showcase' | 'testimonial' | 'demonstration' | 'other';
  description: string;
  visualElements: string[];
  textOverlays: string[];
  audioElements: string[];
  /** What feeling this scene creates */
  emotionalIntent?: string;
}

/**
 * Hook analysis from ad format extraction
 */
export interface HookAnalysis {
  type: 'question' | 'bold-claim' | 'visual-shock' | 'testimonial' | 'problem-agitation' | 'curiosity-gap' | 'pattern-interrupt' | 'social-proof' | 'demonstration' | 'other';
  duration: number;
  openingLine?: string;
  /** First visual that grabs attention */
  visualHook?: string;
  elements: string[];
  /** What mental/emotional trigger does this activate? */
  psychologicalTrigger?: string;
  effectiveness: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * CTA analysis from ad format extraction
 */
export interface CTAAnalysis {
  placement: 'end' | 'middle' | 'multiple' | 'throughout';
  style: 'verbal' | 'text-overlay' | 'button' | 'combined';
  timing: number[];
  text: string[];
  urgency: 'high' | 'medium' | 'low';
  /** What creates the urgency (scarcity, deadline, FOMO) */
  urgencyMechanism?: string;
}

/**
 * Pacing analysis from ad format extraction
 */
export interface PacingAnalysis {
  overallPace: 'fast' | 'medium' | 'slow';
  averageCutDuration: number;
  totalCuts: number;
  cutFrequency: number;
  rhythmPattern: 'builds-to-climax' | 'consistent' | 'slow-then-fast' | 'peaks-and-valleys' | string;
  /** How energy/intensity changes through the ad */
  energyProgression?: string;
}

/**
 * Product mention extracted from ad
 */
export interface ProductMention {
  name: string;
  winningPrice: number | null;
  retailValue: number | null;
  category: 'electronics' | 'appliances' | 'jewelry' | 'fashion' | 'outdoor' | 'home' | 'beauty' | 'automotive' | 'other';
  sceneNumber: number;
  timestamp: number;
  /** How is this product shown/described? */
  presentationStyle?: string;
}

// ========== NEW ENHANCED ANALYSIS TYPES ==========

/**
 * Persuasion techniques identified in the ad
 */
export interface PersuasionTechniques {
  primary: 'scarcity' | 'social-proof' | 'authority' | 'reciprocity' | 'liking' | 'consistency' | 'fear-of-missing-out' | 'curiosity' | 'greed' | 'exclusivity';
  secondary: string[];
  /** Quotes/descriptions proving each technique */
  evidence: string[];
}

/**
 * Cognitive bias exploitation in the ad
 */
export interface CognitiveBiasUsage {
  bias: 'anchoring' | 'loss-aversion' | 'bandwagon' | 'sunk-cost' | 'framing' | 'availability' | 'confirmation' | 'optimism' | 'zero-risk' | 'hyperbolic-discounting' | 'endowment' | 'status-quo' | 'halo-effect' | 'authority' | 'in-group';
  howUsed: string;
  evidence: string;
}

/**
 * Cognitive biases analysis
 */
export interface CognitiveBiases {
  biasesExploited: CognitiveBiasUsage[];
  /** How is the decision framed? (gain vs loss, now vs later, us vs them) */
  decisionFraming: string;
  /** How are options presented to guide the decision? */
  choiceArchitecture: string;
}

/**
 * Emotional trigger in the ad
 */
export interface EmotionalTrigger {
  trigger: 'fear-of-loss' | 'desire-for-gain' | 'status-seeking' | 'belonging' | 'exclusivity' | 'curiosity' | 'greed' | 'envy' | 'hope' | 'frustration' | 'relief' | 'excitement' | 'pride' | 'guilt' | 'shame';
  intensity: 'subtle' | 'moderate' | 'strong';
  mechanism: string;
  timestamp?: number;
}

/**
 * Pain point agitation analysis
 */
export interface PainPointAgitation {
  painIdentified: string;
  agitationLevel: 'mild' | 'moderate' | 'intense';
  agitationTechnique: string;
}

/**
 * Desire amplification analysis
 */
export interface DesireAmplification {
  desireTargeted: string;
  amplificationTechnique: string;
}

/**
 * Emotional manipulation analysis
 */
export interface EmotionalManipulation {
  primaryEmotion: string;
  emotionalTriggers: EmotionalTrigger[];
  painPointAgitation: PainPointAgitation;
  desireAmplification: DesireAmplification;
}

/**
 * Emotional arc through the ad
 */
export interface EmotionalArc {
  opening: 'curiosity' | 'fear' | 'excitement' | 'frustration' | 'hope' | 'skepticism' | 'intrigue' | 'confusion';
  middle: 'desire' | 'trust' | 'urgency' | 'aspiration' | 'envy' | 'anticipation' | 'belief' | 'validation';
  closing: 'confidence' | 'excitement' | 'fear-of-missing-out' | 'empowerment' | 'relief' | 'determination';
  peakMoment: {
    timestamp: number;
    emotion: string;
    trigger: string;
  };
  /** Describe the viewer's emotional journey in one sentence */
  emotionalJourney: string;
  /** How does the ad resolve the emotional tension it creates? */
  emotionalResolution: string;
}

/**
 * Psychological hooks analysis
 */
export interface PsychologicalHooks {
  /** Unanswered questions that keep viewers watching */
  openLoops: string[];
  /** What information is teased but withheld? */
  curiosityGaps: string[];
  /** Unexpected elements that reset attention */
  patternInterrupts: string[];
  /** Who does the viewer want to BE? How does the ad tap into that? */
  identityAppeals: string[];
  /** In-group/out-group dynamics being leveraged */
  tribalSignaling: string[];
  /** How does this appeal to status/prestige desires? */
  statusSignaling: string[];
}

/**
 * Audience targeting analysis
 */
export interface AudienceTargeting {
  /** Who is this ad FOR? Be specific. */
  primaryAudience: string;
  demographicSignals: string[];
  /** What problems/frustrations does this address? */
  painPoints: string[];
  /** What aspirations/wants does this appeal to? */
  desires: string[];
  /** Specific words/phrases that signal the target audience */
  languageSignals: string[];
  /** Who is this ad NOT for? */
  exclusionSignals: string[];
}

/**
 * Price anchoring analysis
 */
export interface PriceAnchoring {
  /** The high reference price mentioned */
  anchorPrice: string | null;
  /** The actual price/deal */
  offerPrice: string | null;
  /** How savings are presented: '90% off', 'pennies on the dollar' */
  savingsFraming: string;
  /** How is the value justified/explained? */
  valueJustification: string;
}

/**
 * Value proposition analysis
 */
export interface ValueProposition {
  /** The core deal/benefit in one sentence */
  mainOffer: string;
  /** What makes this different from competitors? */
  uniqueAngle: string;
  priceAnchoring: PriceAnchoring;
  /** Any guarantees, money-back offers, or risk reducers? */
  riskReversal: string;
}

/**
 * Trust signals analysis
 */
export interface TrustSignals {
  /** Testimonials, user counts, 'as seen on', reviews mentioned */
  socialProof: string[];
  /** Expert endorsements, credentials, institutional backing */
  authority: string[];
  /** Money-back, authenticity, quality guarantees */
  guarantees: string[];
  /** Behind-the-scenes, process shown, 'how it works' */
  transparency: string[];
  /** What might make viewers skeptical? What's NOT addressed? */
  credibilityGaps: string[];
}

/**
 * Retention hook in the ad
 */
export interface RetentionHook {
  timestamp: number;
  technique: 'open-loop' | 'pattern-interrupt' | 'curiosity-gap' | 'value-tease' | 'cliffhanger';
  description: string;
}

/**
 * Potential drop-off point
 */
export interface DropOffRisk {
  timestamp: number;
  reason: string;
}

/**
 * Attention mechanics analysis
 */
export interface AttentionMechanics {
  /** Quantified hook effectiveness (1-10) */
  hookStrength: number;
  /** What keeps people watching */
  retentionHooks: RetentionHook[];
  /** Where viewers might leave */
  dropOffRisks: DropOffRisk[];
  /** How does the ad recapture wandering attention? */
  reengagementTechniques: string[];
}

/**
 * Copy/script analysis
 */
export interface CopyAnalysis {
  /** "Free", "Exclusive", "Limited", "Secret", "Guaranteed" */
  powerWords: string[];
  /** Statements about what the viewer GAINS */
  benefitStatements: string[];
  /** Statements about product attributes */
  featureStatements: string[];
  /** Phrases designed to trigger emotions */
  emotionalTriggerPhrases: string[];
  /** How does the copy address potential objections? */
  objectionHandlers: string[];
  callToActionPhrases: string[];
  /** Overall tone: urgent-exciting, calm-authoritative, friendly-casual, etc. */
  toneDescriptor: string;
}

/**
 * Narrative structure analysis
 */
export interface NarrativeStructure {
  type: 'problem-solution' | 'before-after' | 'testimonial-story' | 'demonstration' | 'listicle' | 'curiosity-reveal' | 'transformation' | 'day-in-life';
  /** Brief description of the narrative flow */
  storyArc: string;
  /** Who is the 'hero' of this story? (viewer, product, winner, host) */
  protagonist: string;
  /** What tension/problem drives the narrative? */
  conflict: string;
  /** How is the tension resolved? */
  resolution: string;
  /** What transformation is promised to the viewer? */
  transformationPromise: string;
}

/**
 * Effectiveness assessment
 */
export interface EffectivenessAssessment {
  overallScore: number;
  hookEffectiveness: string;
  persuasionEffectiveness: string;
  ctaEffectiveness: string;
  /** Specific things this ad does WELL - be actionable */
  strengths: string[];
  /** Specific things that could be IMPROVED - be actionable */
  weaknesses: string[];
  /** What persuasion techniques or elements are ABSENT that could help? */
  missingElements: string[];
  /** If recreating this ad for a different product, what are the KEY elements to preserve? */
  replicationGuide: string;
}

/**
 * Visual elements analysis
 */
export interface VisualElements {
  textOverlays: string[];
  transitions: string[];
  /** Dominant colors and their emotional effect */
  colorPalette: string[];
  style: 'professional' | 'ugc' | 'animated' | 'mixed' | 'documentary';
  /** What draws the eye first, second, third? */
  visualHierarchy?: string;
}

/**
 * Audio elements analysis
 */
export interface AudioElements {
  hasMusic: boolean;
  musicStyle?: 'upbeat' | 'dramatic' | 'calm' | 'tense' | 'triumphant' | string;
  /** What emotion does the music reinforce? */
  musicPurpose?: string;
  hasVoiceover: boolean;
  voiceoverStyle?: 'energetic' | 'conversational' | 'authoritative' | 'friendly' | 'urgent' | string;
  /** Who is speaking? (expert, everyman, excited winner, host) */
  voiceoverPersona?: string;
  soundEffects: string[];
  /** What do the sound effects emphasize? */
  soundEffectPurpose?: string;
}

/**
 * Complete ad format analysis result
 */
export interface AdFormatAnalysis {
  filename: string;
  videoId: string;
  duration: number;
  transcript: {
    fullText: string;
    segments: Array<{ text: string; start: number; end: number }>;
  };

  // ========== STRUCTURAL ANALYSIS (What's in the ad) ==========
  scenes: SceneAnalysis[];
  hook: HookAnalysis;
  cta: CTAAnalysis;
  pacing: PacingAnalysis;
  products: ProductMention[];
  visualElements: VisualElements;
  audioElements: AudioElements;

  // ========== PERSUASION ANALYSIS (Why it works) ==========
  /** Persuasion techniques identified */
  persuasionTechniques?: PersuasionTechniques;
  /** Cognitive biases exploited */
  cognitiveBiases?: CognitiveBiases;
  /** Emotional manipulation analysis */
  emotionalManipulation?: EmotionalManipulation;
  /** Emotional arc through the ad */
  emotionalArc?: EmotionalArc;
  /** Psychological hooks analysis */
  psychologicalHooks?: PsychologicalHooks;
  /** Target audience analysis */
  audienceTargeting?: AudienceTargeting;
  /** Value proposition analysis */
  valueProposition?: ValueProposition;
  /** Trust signals analysis */
  trustSignals?: TrustSignals;
  /** Attention mechanics analysis */
  attentionMechanics?: AttentionMechanics;
  /** Copy/script analysis */
  copyAnalysis?: CopyAnalysis;
  /** Narrative structure analysis */
  narrativeStructure?: NarrativeStructure;

  // ========== EFFECTIVENESS ASSESSMENT ==========
  /** Effectiveness assessment */
  effectivenessAssessment?: EffectivenessAssessment;

  formatSummary: string;
  confidence: number;
}

/**
 * Ad format analysis job result
 */
export interface AdFormatAnalysisJobResult {
  success: boolean;
  filename: string;
  videoId: string;
  /** Full analysis result (serialized) */
  analysis?: string;
  /** Error message if failed */
  error?: string;
  /** Processing time in ms */
  processingTimeMs?: number;
}

/**
 * Job progress update
 */
export interface JobProgress {
  /** Current stage */
  stage: 'queued' | 'pre-screening' | 'indexing' | 'analyzing' | 'complete' | 'failed';
  /** Progress percentage (0-100) */
  percentage: number;
  /** Status message */
  message?: string;
  /** Estimated time remaining in ms */
  etaMs?: number;
}

/**
 * Default job options for each queue
 */
export const DEFAULT_JOB_OPTIONS = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
    removeOnComplete: { age: 3600 }, // 1 hour
    removeOnFail: { age: 86400 }, // 24 hours
  },
  [QUEUE_NAMES.IMAGE_ANALYSIS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 1000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
  [QUEUE_NAMES.SCRAPER]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
  [QUEUE_NAMES.BATCH_COORDINATOR]: {
    attempts: 1,
    removeOnComplete: { age: 7200 }, // 2 hours
    removeOnFail: { age: 86400 },
  },
  [QUEUE_NAMES.AD_FORMAT_ANALYSIS]: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 3000 },
    removeOnComplete: { age: 7200 }, // 2 hours
    removeOnFail: { age: 86400 }, // 24 hours
  },
};

/**
 * Queue concurrency settings - increased for higher throughput with upgraded API limits
 */
export const QUEUE_CONCURRENCY = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: 25,
  [QUEUE_NAMES.IMAGE_ANALYSIS]: 50,
  [QUEUE_NAMES.SCRAPER]: 15,
  [QUEUE_NAMES.BATCH_COORDINATOR]: 5,
  [QUEUE_NAMES.AD_FORMAT_ANALYSIS]: 25, // Claude Tier 2: 1000 RPM available
};

/**
 * Rate limiting settings (jobs per second) - increased for higher throughput
 */
export const QUEUE_RATE_LIMITS = {
  [QUEUE_NAMES.VIDEO_ANALYSIS]: { max: 25, duration: 1000 },
  [QUEUE_NAMES.IMAGE_ANALYSIS]: { max: 50, duration: 1000 },
  [QUEUE_NAMES.SCRAPER]: { max: 15, duration: 1000 },
  [QUEUE_NAMES.BATCH_COORDINATOR]: { max: 5, duration: 1000 },
  [QUEUE_NAMES.AD_FORMAT_ANALYSIS]: { max: 250, duration: 60000 }, // 250 per minute
};
