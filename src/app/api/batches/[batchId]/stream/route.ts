import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { searchCreator } from '@/lib/exa';
import {
  analyzeValidatedResults,
  calculateRiskLevel,
  generateSummary,
} from '@/lib/search-queries';
import { validateResults, generateRationale } from '@/lib/result-validator';
import {
  fetchAllSocialMedia,
  analyzeSocialMediaContent,
  convertAnalysisToFindings,
} from '@/lib/social-media';
import { detectProfanity } from '@/lib/profanity';
import { searchFlaggedTopics, isGoogleSearchConfigured } from '@/lib/google-search';
import { convertBrandResults, convertKeywordResults, convertWebSearchResults } from '@/lib/v1-adapter';
import { extractSocialHandles } from '@/lib/utils';
import type { PlatformStatus } from '@prisma/client';

// Concurrency settings
const CONCURRENT_CREATORS = 10; // Process 10 creators at a time for better throughput

// Helper to chunk an array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// GET /api/batches/[batchId]/stream - SSE stream for batch processing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Helper to update platform status
      const updatePlatformStatus = async (
        creatorId: string,
        platform: 'instagram' | 'youtube' | 'tiktok' | 'web',
        status: PlatformStatus
      ) => {
        // Map platform to field name (web -> webSearchStatus)
        const fieldMap: Record<string, string> = {
          instagram: 'instagramStatus',
          youtube: 'youtubeStatus',
          tiktok: 'tiktokStatus',
          web: 'webSearchStatus',
        };
        const field = fieldMap[platform];
        await db.creator.update({
          where: { id: creatorId },
          data: { [field]: status },
        });
      };

      // Helper to save attachment
      const saveAttachment = async (
        creatorId: string,
        type: string,
        data: unknown,
        platform?: string
      ) => {
        await db.attachment.create({
          data: {
            creatorId,
            type,
            platform,
            data: JSON.stringify(data),
          },
        });
      };

      // Process a single creator - returns result for tracking
      const processCreator = async (creator: {
        id: string;
        name: string;
        socialLinks: string;
        status: string;
        language: string;
      }, searchTerms: string[]) => {
        // Skip already completed creators
        if (creator.status === 'COMPLETED') {
          return { skipped: true };
        }

        sendEvent('creator_started', {
          creatorId: creator.id,
          name: creator.name,
        });

        try {
          // Update status to processing
          await db.creator.update({
            where: { id: creator.id },
            data: { status: 'PROCESSING' },
          });

          // Parse social links and determine which platforms to process
          const socialLinks = JSON.parse(creator.socialLinks);
          const handles = extractSocialHandles(socialLinks);

          // Determine which platforms have handles
          const hasInstagram = handles.some(h => h.platform === 'instagram');
          const hasYoutube = handles.some(h => h.platform === 'youtube');
          const hasTiktok = handles.some(h => h.platform === 'tiktok');

          // Set platform statuses to PENDING for platforms we'll process
          if (hasInstagram) await updatePlatformStatus(creator.id, 'instagram', 'PENDING');
          if (hasYoutube) await updatePlatformStatus(creator.id, 'youtube', 'PENDING');
          if (hasTiktok) await updatePlatformStatus(creator.id, 'tiktok', 'PENDING');
          await updatePlatformStatus(creator.id, 'web', 'PENDING');

          // Perform research - run Exa, Google, and social media fetch in parallel
          const handleNames = handles.map(h => h.handle);

          const [exaResult, googleResult, socialMediaContent] = await Promise.all([
            searchCreator(creator.name, socialLinks, searchTerms),
            isGoogleSearchConfigured()
              ? searchFlaggedTopics(creator.name, handleNames, creator.language || 'en')
              : Promise.resolve({ results: [], queries: [], topicCounts: {}, hasResults: false }),
            fetchAllSocialMedia(socialLinks, 6), // Fetch last 6 months
          ]);

          const { results, queries } = exaResult;

          // Update web search status
          await updatePlatformStatus(creator.id, 'web', 'READY');

          // Save Google search results as attachment
          if (googleResult.results.length > 0) {
            await saveAttachment(creator.id, 'web-search', {
              results: convertWebSearchResults(googleResult),
              summary: '',
            }, 'web');
          }

          // Validate Exa results with heuristics + AI review
          const validatedResults = await validateResults(
            results,
            creator.name,
            socialLinks
          );

          // Analyze validated Exa findings
          const exaFindings = analyzeValidatedResults(validatedResults, creator.name);

          // Track profanity across all content
          let allProfanityResults: ReturnType<typeof detectProfanity>[] = [];

          // Analyze social media content for brand safety concerns
          let socialMediaFindings: typeof exaFindings = [];
          let socialMediaAnalyses: Awaited<ReturnType<typeof analyzeSocialMediaContent>> = [];

          if (socialMediaContent.length > 0) {
            const totalPosts = socialMediaContent.reduce((sum, c) => sum + c.posts.length, 0);
            if (totalPosts > 0) {
              console.log(`Analyzing ${totalPosts} social media posts for ${creator.name}`);
              socialMediaAnalyses = await analyzeSocialMediaContent(socialMediaContent, creator.name);
              socialMediaFindings = convertAnalysisToFindings(socialMediaAnalyses);

              // Run profanity detection on each platform's content
              for (const platformContent of socialMediaContent) {
                const platform = platformContent.platform;
                let platformStatus: PlatformStatus = 'READY';

                try {
                  // Detect profanity in posts
                  const platformProfanityResults = platformContent.posts.map(post => {
                    const content = post.caption + (post.transcript ? '\n' + post.transcript : '');
                    return detectProfanity(content, creator.language || 'en');
                  });

                  allProfanityResults.push(...platformProfanityResults);

                  // Save profanity results as attachment
                  const hasProfanity = platformProfanityResults.some(r => r.hasProfanity);
                  if (hasProfanity) {
                    await saveAttachment(creator.id, `profanity-${platform}`, {
                      hasProfanity: true,
                      matches: platformProfanityResults.flatMap(r => r.matches),
                    }, platform);
                  }

                  // Get brand results for this platform from the analysis
                  const platformAnalysis = socialMediaAnalyses.find(a => a.platform === platform);
                  if (platformAnalysis) {
                    // Note: Brand/keyword results are already integrated in the analysis
                    // We could extract and save them separately here if needed
                  }
                } catch (error) {
                  console.error(`Error processing ${platform} for ${creator.name}:`, error);
                  platformStatus = 'FAILED';
                }

                // Update platform status
                await updatePlatformStatus(creator.id, platform as 'instagram' | 'youtube' | 'tiktok', platformStatus);
              }
            }
          }

          // Aggregate profanity results
          const aggregatedProfanity = {
            hasProfanity: allProfanityResults.some(r => r.hasProfanity),
            maxSeverity: Math.max(0, ...allProfanityResults.map(r => r.maxSeverity)),
            matches: allProfanityResults.flatMap(r => r.matches),
            categories: [...new Set(allProfanityResults.flatMap(r => r.categories))],
          };

          // Save aggregated profanity
          if (aggregatedProfanity.hasProfanity) {
            await saveAttachment(creator.id, 'profanity', aggregatedProfanity);
          }

          // Merge all findings
          const findings = [...exaFindings, ...socialMediaFindings];
          const riskLevel = calculateRiskLevel(findings);

          // Generate AI rationale summary
          const rationale = await generateRationale(
            findings,
            creator.name,
            socialLinks
          );

          // Create report - include all results
          await db.report.create({
            data: {
              creatorId: creator.id,
              riskLevel,
              summary: rationale,
              findings: JSON.stringify(findings),
              rawResults: JSON.stringify({
                exa: results,
                google: googleResult,
                socialMedia: socialMediaContent,
                socialMediaAnalyses: socialMediaAnalyses,
                profanity: aggregatedProfanity,
              }),
              searchQueries: JSON.stringify([...queries, ...googleResult.queries]),
            },
          });

          // Update creator status
          await db.creator.update({
            where: { id: creator.id },
            data: { status: 'COMPLETED' },
          });

          sendEvent('creator_completed', {
            creatorId: creator.id,
            name: creator.name,
            riskLevel,
            findingsCount: findings.length,
            summary: rationale,
            profanityDetected: aggregatedProfanity.hasProfanity,
            googleResults: googleResult.results.length,
          });

          return { success: true };
        } catch (error) {
          console.error(`Failed to process creator ${creator.name}:`, error);

          await db.creator.update({
            where: { id: creator.id },
            data: {
              status: 'FAILED',
              instagramStatus: 'FAILED',
              youtubeStatus: 'FAILED',
              tiktokStatus: 'FAILED',
              webSearchStatus: 'FAILED',
            },
          });

          sendEvent('creator_failed', {
            creatorId: creator.id,
            name: creator.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          return { failed: true };
        }
      };

      try {
        const batch = await db.batch.findUnique({
          where: { id: batchId },
          include: { creators: true },
        });

        if (!batch) {
          sendEvent('error', { message: 'Batch not found' });
          controller.close();
          return;
        }

        const searchTerms = batch.searchTerms
          ? JSON.parse(batch.searchTerms)
          : [];

        // Filter out already completed creators
        const pendingCreators = batch.creators.filter(c => c.status !== 'COMPLETED');

        // Process creators in parallel batches
        const creatorChunks = chunk(pendingCreators, CONCURRENT_CREATORS);

        for (const creatorBatch of creatorChunks) {
          // Process this chunk in parallel
          await Promise.allSettled(
            creatorBatch.map(creator => processCreator(creator, searchTerms))
          );

          // Small delay between batches to avoid overwhelming APIs
          if (creatorChunks.indexOf(creatorBatch) < creatorChunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Mark batch as completed
        await db.batch.update({
          where: { id: batchId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        sendEvent('batch_completed', { batchId, status: 'COMPLETED' });
      } catch (error) {
        console.error('Stream error:', error);
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
