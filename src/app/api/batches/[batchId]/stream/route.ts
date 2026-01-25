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
  extractBrandPartnerships,
  buildPartnershipReport,
  identifyCompetitors,
} from '@/lib/social-media';
import type { BrandPartnership } from '@/types/social-media';
import type { Finding } from '@/types';
import { detectProfanity } from '@/lib/profanity';
import { searchFlaggedTopics, isGoogleSearchConfigured } from '@/lib/google-search';
import { convertBrandResults, convertKeywordResults, convertWebSearchResults } from '@/lib/v1-adapter';
import { extractSocialHandles } from '@/lib/utils';
import type { PlatformStatus } from '@prisma/client';

// Concurrency settings - increased for higher throughput with upgraded API limits
const CONCURRENT_CREATORS = 25; // Process 25 creators at a time for better throughput

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
      console.log('[DEBUG] SSE stream started for batch:', batchId);

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
        monthsBack: number | null;
        clientBrand: string | null;
      }, searchTerms: string[]) => {
        console.log('[DEBUG] Processing creator:', creator.name, 'status:', creator.status);

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
          const monthsBack = creator.monthsBack || 6; // Default to 6 months if not specified

          const [exaResult, googleResult, socialMediaContent] = await Promise.all([
            searchCreator(creator.name, socialLinks, searchTerms),
            isGoogleSearchConfigured()
              ? searchFlaggedTopics(creator.name, handleNames, creator.language || 'en')
              : Promise.resolve({ results: [], queries: [], topicCounts: {}, hasResults: false }),
            fetchAllSocialMedia(socialLinks, monthsBack),
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
          let allBrandPartnerships: BrandPartnership[] = [];

          if (socialMediaContent.length > 0) {
            const totalPosts = socialMediaContent.reduce((sum, c) => sum + c.posts.length, 0);
            if (totalPosts > 0) {
              console.log(`Analyzing ${totalPosts} social media posts for ${creator.name}`);
              socialMediaAnalyses = await analyzeSocialMediaContent(socialMediaContent, creator.name, creator.language || 'en');
              socialMediaFindings = convertAnalysisToFindings(socialMediaAnalyses);

              // Run profanity detection and brand partnership extraction on each platform's content
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

                  // Extract brand partnerships from posts
                  console.log(`Extracting brand partnerships from ${platformContent.posts.length} ${platform} posts...`);
                  const platformPartnerships = await extractBrandPartnerships(
                    platformContent.posts,
                    platform
                  );
                  allBrandPartnerships.push(...platformPartnerships);
                  console.log(`Found ${platformPartnerships.length} brand partnerships on ${platform}`);
                } catch (error) {
                  console.error(`Error processing ${platform} for ${creator.name}:`, error);
                  platformStatus = 'FAILED';
                }

                // Update platform status
                await updatePlatformStatus(creator.id, platform as 'instagram' | 'youtube' | 'tiktok', platformStatus);
              }
            }
          }

          // Identify competitors if client brand is provided
          let competitors: string[] = [];
          if (creator.clientBrand) {
            console.log(`Identifying competitors for client brand: ${creator.clientBrand}`);
            competitors = await identifyCompetitors(creator.clientBrand);
            if (competitors.length > 0) {
              await saveAttachment(creator.id, 'competitor-brands', {
                clientBrand: creator.clientBrand,
                competitors,
              });
            }
          }

          // Build and save brand partnership report with competitor flagging
          const partnershipReport = buildPartnershipReport(allBrandPartnerships, competitors);
          if (partnershipReport.totalPartnerships > 0) {
            console.log(`Saving brand partnership report: ${partnershipReport.totalPartnerships} partnerships with ${partnershipReport.uniqueBrands.length} unique brands`);
            if (partnershipReport.competitorPartnerships.length > 0) {
              console.log(`⚠️ Found ${partnershipReport.competitorPartnerships.length} competitor partnerships!`);
            }
            await saveAttachment(creator.id, 'brand-partnerships', partnershipReport);
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

          // Create competitor findings from partnership report
          const competitorFindings: Finding[] = partnershipReport.competitorPartnerships.map((partnership) => ({
            type: 'competitor_partnership' as const,
            title: `Competitor Partnership: ${partnership.brand}`,
            summary: `Creator has a ${partnership.partnershipType} partnership with ${partnership.brand}, a competitor to ${creator.clientBrand}. Post date: ${new Date(partnership.postDate).toLocaleDateString()}. ${partnership.context.slice(0, 200)}${partnership.context.length > 200 ? '...' : ''}`,
            severity: 'high' as const,
            source: {
              url: partnership.permalink,
              title: `${partnership.platform.charAt(0).toUpperCase() + partnership.platform.slice(1)} post with ${partnership.brand}`,
              publishedDate: partnership.postDate,
            },
            validation: {
              isSamePerson: 'yes' as const,
              confidence: partnership.confidence,
              reason: `Brand partnership detected with competitor ${partnership.brand}. Indicators: ${partnership.indicators.join(', ') || 'brand mention'}`,
            },
            socialMediaSource: {
              platform: partnership.platform,
              handle: '', // Not stored in partnership
              postId: partnership.postId,
              thumbnailUrl: partnership.thumbnailUrl,
            },
          }));

          // Merge all findings
          const findings = [...exaFindings, ...socialMediaFindings, ...competitorFindings];
          const riskLevel = calculateRiskLevel(findings);

          // Generate AI rationale summary (use creator's language setting)
          const rationale = await generateRationale(
            findings,
            creator.name,
            socialLinks,
            creator.language || 'en'
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
                brandPartnerships: partnershipReport,
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
            brandPartnerships: partnershipReport.totalPartnerships,
            uniqueBrands: partnershipReport.uniqueBrands.length,
            competitorPartnerships: partnershipReport.competitorPartnerships.length,
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
        // Start timing for throughput metrics
        const batchStartTime = Date.now();
        let completedCreators = 0;
        let failedCreators = 0;
        let totalPosts = 0;

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
          const results = await Promise.allSettled(
            creatorBatch.map(creator => processCreator(creator, searchTerms))
          );

          // Track results for metrics
          for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
              if (result.value.success) {
                completedCreators++;
              } else if (result.value.failed) {
                failedCreators++;
              }
            }
          }

          // Small delay between batches to avoid overwhelming APIs (reduced from 300ms)
          if (creatorChunks.indexOf(creatorBatch) < creatorChunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        // Calculate throughput metrics
        const batchEndTime = Date.now();
        const durationMs = batchEndTime - batchStartTime;
        const durationMinutes = durationMs / 60000;

        // Get post count from completed creators
        const completedCreatorRecords = await db.creator.findMany({
          where: {
            batchId: batchId,
            status: 'COMPLETED',
          },
          include: {
            report: true,
          },
        });

        for (const creator of completedCreatorRecords) {
          if (creator.report) {
            try {
              const rawResults = JSON.parse(creator.report.rawResults || '{}');
              const socialMedia = rawResults.socialMedia || [];
              for (const platform of socialMedia) {
                totalPosts += platform.posts?.length || 0;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        const metrics = {
          durationMs,
          durationMinutes: Math.round(durationMinutes * 100) / 100,
          totalCreators: pendingCreators.length,
          completedCreators,
          failedCreators,
          totalPosts,
          creatorsPerMinute: durationMinutes > 0 ? Math.round((completedCreators / durationMinutes) * 100) / 100 : 0,
          postsPerMinute: durationMinutes > 0 ? Math.round((totalPosts / durationMinutes) * 100) / 100 : 0,
          concurrencyUsed: CONCURRENT_CREATORS,
        };

        console.log('[BatchMetrics]', JSON.stringify(metrics, null, 2));

        // Mark batch as completed
        await db.batch.update({
          where: { id: batchId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        sendEvent('batch_completed', {
          batchId,
          status: 'COMPLETED',
          metrics,
        });
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
