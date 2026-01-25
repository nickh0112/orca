/**
 * Ad Format Analysis Worker
 *
 * Processes ad format analysis jobs from the BullMQ queue.
 * Uses Twelve Labs for video understanding + Claude for format extraction.
 *
 * Features:
 * - Extract transcript with timestamps
 * - Scene-by-scene breakdown
 * - Hook/CTA/Pacing analysis
 * - Product mention extraction
 * - Progress reporting
 */

import { Worker, Job } from 'bullmq';
import Anthropic from '@anthropic-ai/sdk';
import {
  QUEUE_NAMES,
  QUEUE_CONCURRENCY,
  type AdFormatAnalysisJobData,
  type AdFormatAnalysisJobResult,
  type AdFormatAnalysis,
  type JobProgress,
} from '../job-types';
import { getRedisConnectionOptions } from '../redis-client';

const TWELVE_LABS_API_BASE = 'https://api.twelvelabs.io/v1.3';

function getHeaders(): HeadersInit {
  return {
    'x-api-key': process.env.TWELVE_LABS_API_KEY || '',
    'Content-Type': 'application/json',
  };
}

/**
 * Get transcript from Twelve Labs
 */
async function getTranscript(
  indexId: string,
  videoId: string
): Promise<{ fullText: string; segments: Array<{ text: string; start: number; end: number }> }> {
  const response = await fetch(
    `${TWELVE_LABS_API_BASE}/indexes/${indexId}/videos/${videoId}?transcription=true`,
    { headers: getHeaders() }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return { fullText: '', segments: [] };
    }
    throw new Error(`Failed to get transcript: ${response.status}`);
  }

  const data = await response.json();
  const transcription = data.transcription || [];

  if (transcription.length === 0) {
    return { fullText: '', segments: [] };
  }

  const fullText = transcription.map((seg: { value: string }) => seg.value).join(' ');
  const segments = transcription.map((seg: { value: string; start: number; end: number }) => ({
    text: seg.value,
    start: seg.start,
    end: seg.end,
  }));

  return { fullText, segments };
}

/**
 * Get video summary from Twelve Labs
 */
async function getVideoSummary(videoId: string): Promise<string> {
  const response = await fetch(`${TWELVE_LABS_API_BASE}/summarize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      video_id: videoId,
      type: 'summary',
      prompt: `Analyze this advertisement video in detail. Describe:
1. The overall structure and flow
2. Key visual scenes and their timing
3. Any text overlays or graphics
4. Audio elements (music, voiceover style)
5. The hook (opening) and call-to-action
6. Products or prizes shown
7. The pacing and editing style`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get summary: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.summary || '';
}

/**
 * Claude prompt for ad format analysis
 * Enhanced to capture not just WHAT is in an ad, but WHY it works
 */
const AD_FORMAT_ANALYSIS_PROMPT = `You are an expert ad creative analyst and direct response copywriter. Analyze this advertisement video to understand both WHAT it contains and WHY it works (or doesn't).

VIDEO SUMMARY:
{videoSummary}

TRANSCRIPT:
{transcript}

Analyze this ad and return a comprehensive JSON analysis:

{
  // ========== STRUCTURAL ANALYSIS (What's in the ad) ==========

  "scenes": [
    {
      "sceneNumber": 1,
      "startTime": 0,
      "endTime": 5,
      "duration": 5,
      "purpose": "hook|problem|solution|social-proof|cta|transition|product-showcase|testimonial|demonstration",
      "description": "What happens in this scene",
      "visualElements": ["text overlay", "product shot", "face close-up"],
      "textOverlays": ["exact text shown on screen"],
      "audioElements": ["music style", "voiceover", "sound effect"],
      "emotionalIntent": "What feeling this scene creates"
    }
  ],

  "hook": {
    "type": "question|bold-claim|visual-shock|testimonial|problem-agitation|curiosity-gap|pattern-interrupt|social-proof|demonstration",
    "duration": 3,
    "openingLine": "First words spoken or shown",
    "visualHook": "First visual that grabs attention",
    "elements": ["specific elements that make it compelling"],
    "psychologicalTrigger": "What mental/emotional trigger does this activate?",
    "effectiveness": "high|medium|low",
    "reason": "WHY this hook works or doesn't - be specific"
  },

  "cta": {
    "placement": "end|middle|multiple|throughout",
    "style": "verbal|text-overlay|button|combined",
    "timing": [25, 30],
    "text": ["Download now", "Sign up free"],
    "urgency": "high|medium|low",
    "urgencyMechanism": "What creates the urgency (scarcity, deadline, FOMO)"
  },

  "pacing": {
    "overallPace": "fast|medium|slow",
    "averageCutDuration": 2.5,
    "totalCuts": 12,
    "cutFrequency": 4,
    "rhythmPattern": "builds-to-climax|consistent|slow-then-fast|peaks-and-valleys",
    "energyProgression": "How energy/intensity changes through the ad"
  },

  "products": [
    {
      "name": "Product name exactly as mentioned",
      "winningPrice": 100,
      "retailValue": 500,
      "category": "electronics|appliances|jewelry|fashion|outdoor|home|beauty|automotive|other",
      "sceneNumber": 2,
      "timestamp": 8.5,
      "presentationStyle": "How is this product shown/described?"
    }
  ],

  "visualElements": {
    "textOverlays": ["all unique text shown"],
    "transitions": ["cut", "fade", "zoom"],
    "colorPalette": ["dominant colors and their emotional effect"],
    "style": "professional|ugc|animated|mixed|documentary",
    "visualHierarchy": "What draws the eye first, second, third?"
  },

  "audioElements": {
    "hasMusic": true,
    "musicStyle": "upbeat|dramatic|calm|tense|triumphant",
    "musicPurpose": "What emotion does the music reinforce?",
    "hasVoiceover": true,
    "voiceoverStyle": "energetic|conversational|authoritative|friendly|urgent",
    "voiceoverPersona": "Who is speaking? (expert, everyman, excited winner, host)",
    "soundEffects": ["ding", "whoosh", "cash register"],
    "soundEffectPurpose": "What do the sound effects emphasize?"
  },

  // ========== PERSUASION ANALYSIS (Why it works) ==========

  "persuasionTechniques": {
    "primary": "scarcity|social-proof|authority|reciprocity|liking|consistency|fear-of-missing-out|curiosity|greed|exclusivity",
    "secondary": ["list all other techniques used"],
    "evidence": [
      "Quote or description proving each technique: 'Only 3 left!' = scarcity",
      "'Thousands have already won' = social proof"
    ]
  },

  "cognitiveBiases": {
    "biasesExploited": [
      {
        "bias": "anchoring|loss-aversion|bandwagon|sunk-cost|framing|availability|confirmation|optimism|zero-risk|hyperbolic-discounting|endowment|status-quo|halo-effect|authority|in-group",
        "howUsed": "Specific way this bias is triggered in the ad",
        "evidence": "Quote or timestamp proving it"
      }
    ],
    "decisionFraming": "How is the decision framed? (gain vs loss, now vs later, us vs them)",
    "choiceArchitecture": "How are options presented to guide the decision?"
  },

  "emotionalManipulation": {
    "primaryEmotion": "The dominant emotion the ad tries to create",
    "emotionalTriggers": [
      {
        "trigger": "fear-of-loss|desire-for-gain|status-seeking|belonging|exclusivity|curiosity|greed|envy|hope|frustration|relief|excitement|pride|guilt|shame",
        "intensity": "subtle|moderate|strong",
        "mechanism": "How is this emotion triggered?",
        "timestamp": 10
      }
    ],
    "painPointAgitation": {
      "painIdentified": "What pain/problem is highlighted?",
      "agitationLevel": "mild|moderate|intense",
      "agitationTechnique": "How is the pain made more acute?"
    },
    "desireAmplification": {
      "desireTargeted": "What want/aspiration is appealed to?",
      "amplificationTechnique": "How is the desire intensified?"
    }
  },

  "emotionalArc": {
    "opening": "curiosity|fear|excitement|frustration|hope|skepticism|intrigue|confusion",
    "middle": "desire|trust|urgency|aspiration|envy|anticipation|belief|validation",
    "closing": "confidence|excitement|fear-of-missing-out|empowerment|relief|determination",
    "peakMoment": {
      "timestamp": 15,
      "emotion": "The strongest emotion in the ad",
      "trigger": "What causes this emotional peak?"
    },
    "emotionalJourney": "Describe the viewer's emotional journey in one sentence",
    "emotionalResolution": "How does the ad resolve the emotional tension it creates?"
  },

  "psychologicalHooks": {
    "openLoops": ["Unanswered questions that keep viewers watching"],
    "curiosityGaps": ["What information is teased but withheld?"],
    "patternInterrupts": ["Unexpected elements that reset attention"],
    "identityAppeals": ["Who does the viewer want to BE? How does the ad tap into that?"],
    "tribalSignaling": ["In-group/out-group dynamics being leveraged"],
    "statusSignaling": ["How does this appeal to status/prestige desires?"]
  },

  "audienceTargeting": {
    "primaryAudience": "Who is this ad FOR? Be specific.",
    "demographicSignals": ["age indicators", "lifestyle indicators", "interest indicators"],
    "painPoints": ["What problems/frustrations does this address?"],
    "desires": ["What aspirations/wants does this appeal to?"],
    "languageSignals": ["Specific words/phrases that signal the target audience"],
    "exclusionSignals": ["Who is this ad NOT for?"]
  },

  "valueProposition": {
    "mainOffer": "The core deal/benefit in one sentence",
    "uniqueAngle": "What makes this different from competitors?",
    "priceAnchoring": {
      "anchorPrice": "The high reference price mentioned",
      "offerPrice": "The actual price/deal",
      "savingsFraming": "How savings are presented: '90% off', 'pennies on the dollar'",
      "valueJustification": "How is the value justified/explained?"
    },
    "riskReversal": "Any guarantees, money-back offers, or risk reducers?"
  },

  "trustSignals": {
    "socialProof": ["Testimonials, user counts, 'as seen on', reviews mentioned"],
    "authority": ["Expert endorsements, credentials, institutional backing"],
    "guarantees": ["Money-back, authenticity, quality guarantees"],
    "transparency": ["Behind-the-scenes, process shown, 'how it works'"],
    "credibilityGaps": ["What might make viewers skeptical? What's NOT addressed?"]
  },

  "attentionMechanics": {
    "hookStrength": 8,
    "retentionHooks": [
      {
        "timestamp": 10,
        "technique": "open-loop|pattern-interrupt|curiosity-gap|value-tease|cliffhanger",
        "description": "What keeps viewers watching at this point?"
      }
    ],
    "dropOffRisks": [
      {
        "timestamp": 20,
        "reason": "Why might viewers leave here? (boring, confusing, unbelievable)"
      }
    ],
    "reengagementTechniques": ["How does the ad recapture wandering attention?"]
  },

  "copyAnalysis": {
    "powerWords": ["Free", "Exclusive", "Limited", "Secret", "Guaranteed"],
    "benefitStatements": ["Statements about what the viewer GAINS"],
    "featureStatements": ["Statements about product attributes"],
    "emotionalTriggerPhrases": ["Phrases designed to trigger emotions"],
    "objectionHandlers": ["How does the copy address potential objections?"],
    "callToActionPhrases": ["Action phrases used"],
    "toneDescriptor": "Overall tone: urgent-exciting, calm-authoritative, friendly-casual, etc."
  },

  "narrativeStructure": {
    "type": "problem-solution|before-after|testimonial-story|demonstration|listicle|curiosity-reveal|transformation|day-in-life",
    "storyArc": "Brief description of the narrative flow",
    "protagonist": "Who is the 'hero' of this story? (viewer, product, winner, host)",
    "conflict": "What tension/problem drives the narrative?",
    "resolution": "How is the tension resolved?",
    "transformationPromise": "What transformation is promised to the viewer?"
  },

  // ========== EFFECTIVENESS ASSESSMENT ==========

  "effectivenessAssessment": {
    "overallScore": 8,
    "hookEffectiveness": "1-10 with reason",
    "persuasionEffectiveness": "1-10 with reason",
    "ctaEffectiveness": "1-10 with reason",
    "strengths": [
      "Specific things this ad does WELL - be actionable"
    ],
    "weaknesses": [
      "Specific things that could be IMPROVED - be actionable"
    ],
    "missingElements": [
      "What persuasion techniques or elements are ABSENT that could help?"
    ],
    "replicationGuide": "If recreating this ad for a different product, what are the KEY elements to preserve?"
  },

  "formatSummary": "2-3 sentence summary: What type of ad is this, what makes it work, and what's the key takeaway for creating similar ads?",
  "confidence": 0.85
}

ANALYSIS GUIDELINES:
1. Be SPECIFIC - don't say "good hook", say "curiosity-gap hook using price mystery"
2. Quote the transcript when citing evidence for persuasion techniques
3. Think like a direct response copywriter - what psychological triggers are at play?
4. Consider the TARGET AUDIENCE - who would this appeal to and why?
5. Identify both STRENGTHS and WEAKNESSES honestly
6. The "replicationGuide" should be actionable - what would you tell someone recreating this?
7. For products: extract EVERY product mentioned with exact prices if stated

Return ONLY valid JSON, no markdown formatting.`;

/**
 * Process a single ad format analysis job
 */
async function processAdFormatAnalysisJob(
  job: Job<AdFormatAnalysisJobData>
): Promise<AdFormatAnalysisJobResult> {
  const startTime = Date.now();
  const data = job.data;

  console.log(`[AdFormatWorker] Processing job ${data.jobId} for ${data.filename}`);

  try {
    // Update progress: getting transcript
    await updateProgress(job, {
      stage: 'analyzing',
      percentage: 10,
      message: 'Extracting transcript...',
    });

    // Get transcript from Twelve Labs
    const transcript = await getTranscript(data.indexId, data.videoId);
    console.log(
      `[AdFormatWorker] Got transcript: ${transcript.fullText.length} chars, ${transcript.segments.length} segments`
    );

    // Update progress: getting video summary
    await updateProgress(job, {
      stage: 'analyzing',
      percentage: 30,
      message: 'Getting video summary...',
    });

    // Get video summary from Twelve Labs
    const videoSummary = await getVideoSummary(data.videoId);
    console.log(`[AdFormatWorker] Got video summary: ${videoSummary.length} chars`);

    // Update progress: running Claude analysis
    await updateProgress(job, {
      stage: 'analyzing',
      percentage: 50,
      message: 'Running format analysis...',
    });

    // Build prompt
    const prompt = AD_FORMAT_ANALYSIS_PROMPT
      .replace('{videoSummary}', videoSummary)
      .replace('{transcript}', transcript.fullText || '(No speech detected)');

    // Call Claude for format analysis
    // Using higher max_tokens for enhanced analysis with persuasion psychology
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract JSON from response
    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON - handle potential markdown wrapping
    let analysisJson = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      analysisJson = jsonMatch[1];
    }

    const analysis = JSON.parse(analysisJson);

    // Build complete analysis result
    const fullAnalysis: AdFormatAnalysis = {
      filename: data.filename,
      videoId: data.videoId,
      duration: data.duration || 0,
      transcript: {
        fullText: transcript.fullText,
        segments: transcript.segments,
      },

      // ========== STRUCTURAL ANALYSIS ==========
      scenes: analysis.scenes || [],
      hook: analysis.hook || {
        type: 'other',
        duration: 0,
        elements: [],
        effectiveness: 'medium',
        reason: 'Unable to analyze',
      },
      cta: analysis.cta || {
        placement: 'end',
        style: 'combined',
        timing: [],
        text: [],
        urgency: 'medium',
      },
      pacing: analysis.pacing || {
        overallPace: 'medium',
        averageCutDuration: 0,
        totalCuts: 0,
        cutFrequency: 0,
        rhythmPattern: 'unknown',
      },
      products: analysis.products || [],
      visualElements: analysis.visualElements || {
        textOverlays: [],
        transitions: [],
        colorPalette: [],
        style: 'mixed',
      },
      audioElements: analysis.audioElements || {
        hasMusic: false,
        hasVoiceover: false,
        soundEffects: [],
      },

      // ========== PERSUASION ANALYSIS ==========
      persuasionTechniques: analysis.persuasionTechniques,
      cognitiveBiases: analysis.cognitiveBiases,
      emotionalManipulation: analysis.emotionalManipulation,
      emotionalArc: analysis.emotionalArc,
      psychologicalHooks: analysis.psychologicalHooks,
      audienceTargeting: analysis.audienceTargeting,
      valueProposition: analysis.valueProposition,
      trustSignals: analysis.trustSignals,
      attentionMechanics: analysis.attentionMechanics,
      copyAnalysis: analysis.copyAnalysis,
      narrativeStructure: analysis.narrativeStructure,

      // ========== EFFECTIVENESS ASSESSMENT ==========
      effectivenessAssessment: analysis.effectivenessAssessment,

      formatSummary: analysis.formatSummary || '',
      confidence: analysis.confidence || 0.5,
    };

    // Update progress: complete
    await updateProgress(job, {
      stage: 'complete',
      percentage: 100,
      message: 'Analysis complete',
    });

    const processingTimeMs = Date.now() - startTime;
    console.log(`[AdFormatWorker] Completed ${data.filename} in ${processingTimeMs}ms`);

    return {
      success: true,
      filename: data.filename,
      videoId: data.videoId,
      analysis: JSON.stringify(fullAnalysis),
      processingTimeMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AdFormatWorker] Job ${data.jobId} failed:`, errorMessage);

    await updateProgress(job, {
      stage: 'failed',
      percentage: 0,
      message: errorMessage,
    });

    return {
      success: false,
      filename: data.filename,
      videoId: data.videoId,
      error: errorMessage,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Update job progress
 */
async function updateProgress(
  job: Job<AdFormatAnalysisJobData>,
  progress: JobProgress
): Promise<void> {
  await job.updateProgress(progress);
}

/**
 * Create and start the ad format analysis worker
 */
export function createAdFormatWorker(): Worker<
  AdFormatAnalysisJobData,
  AdFormatAnalysisJobResult
> {
  const connection = getRedisConnectionOptions();

  const worker = new Worker<AdFormatAnalysisJobData, AdFormatAnalysisJobResult>(
    QUEUE_NAMES.AD_FORMAT_ANALYSIS,
    processAdFormatAnalysisJob,
    {
      connection,
      concurrency: QUEUE_CONCURRENCY[QUEUE_NAMES.AD_FORMAT_ANALYSIS],
      limiter: {
        max: 100,
        duration: 60000, // 100 per minute (Claude Tier 2)
      },
    }
  );

  worker.on(
    'completed',
    (job: Job<AdFormatAnalysisJobData>, result: AdFormatAnalysisJobResult) => {
      console.log(
        `[AdFormatWorker] Job ${job.id} completed: ${result.success ? 'success' : 'failed'}`
      );
    }
  );

  worker.on('failed', (job: Job<AdFormatAnalysisJobData> | undefined, err: Error) => {
    console.error(`[AdFormatWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('[AdFormatWorker] Worker error:', err);
  });

  console.log('[AdFormatWorker] Worker started');
  return worker;
}

/**
 * Singleton worker instance
 */
let workerInstance: Worker<AdFormatAnalysisJobData, AdFormatAnalysisJobResult> | null =
  null;

/**
 * Get or create the ad format worker
 */
export function getAdFormatWorker(): Worker<
  AdFormatAnalysisJobData,
  AdFormatAnalysisJobResult
> {
  if (!workerInstance) {
    workerInstance = createAdFormatWorker();
  }
  return workerInstance;
}

/**
 * Stop the ad format worker
 */
export async function stopAdFormatWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
    console.log('[AdFormatWorker] Worker stopped');
  }
}
