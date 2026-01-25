#!/usr/bin/env npx tsx
/**
 * Test script for the full video analysis pipeline (Apify → Download → Twelve Labs)
 *
 * This script tests each step of the video pipeline to identify where failures occur:
 * 1. Fetch posts from Instagram/TikTok via Apify
 * 2. Download video from CDN
 * 3. Upload and analyze via Twelve Labs
 *
 * Usage:
 *   npx tsx scripts/test-video-pipeline.ts tiktok @handle
 *   npx tsx scripts/test-video-pipeline.ts instagram @handle
 *
 * Examples:
 *   npx tsx scripts/test-video-pipeline.ts tiktok @charlidamelio
 *   npx tsx scripts/test-video-pipeline.ts instagram @nasa
 */

import 'dotenv/config';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
  fetchInstagramViaApify,
  downloadVideo,
} from '../src/lib/social-media/apify';
import {
  isTwelveLabsConfigured,
  analyzeVideoWithOptions,
} from '../src/lib/video-analysis';

interface StepResult {
  step: string;
  success: boolean;
  details: string;
  data?: unknown;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: npx tsx scripts/test-video-pipeline.ts <platform> <handle>');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/test-video-pipeline.ts tiktok @charlidamelio');
    console.log('  npx tsx scripts/test-video-pipeline.ts instagram @nasa');
    process.exit(1);
  }

  const platform = args[0].toLowerCase() as 'tiktok' | 'instagram';
  const handle = args[1].replace('@', '');

  if (platform !== 'tiktok' && platform !== 'instagram') {
    console.error('Error: Platform must be "tiktok" or "instagram"');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('VIDEO PIPELINE DEBUG TEST');
  console.log('='.repeat(60));
  console.log(`Platform: ${platform}`);
  console.log(`Handle: @${handle}`);
  console.log('='.repeat(60));

  const results: StepResult[] = [];

  // Step 0: Check configuration
  console.log('\n[Step 0] Checking configuration...');

  if (!isApifyConfigured()) {
    console.error('  ✗ APIFY_API_KEY is not configured');
    process.exit(1);
  }
  console.log('  ✓ APIFY_API_KEY is configured');

  if (!isTwelveLabsConfigured()) {
    console.error('  ✗ TWELVE_LABS_API_KEY is not configured');
    process.exit(1);
  }
  console.log('  ✓ TWELVE_LABS_API_KEY is configured');

  // Step 1: Fetch posts via Apify
  console.log('\n[Step 1] Fetching posts via Apify...');
  const fetchStartTime = Date.now();

  try {
    const content = platform === 'tiktok'
      ? await fetchTikTokViaApify(handle, 3) // Last 3 months
      : await fetchInstagramViaApify(handle, 3);

    const fetchTime = ((Date.now() - fetchStartTime) / 1000).toFixed(1);

    if (content.error) {
      results.push({
        step: 'Apify Fetch',
        success: false,
        details: `Error: ${content.error}`,
      });
      console.log(`  ✗ Fetch failed: ${content.error}`);
    } else if (content.posts.length === 0) {
      results.push({
        step: 'Apify Fetch',
        success: false,
        details: 'No posts found',
      });
      console.log('  ✗ No posts found');
    } else {
      const videoPosts = content.posts.filter((p) => p.mediaType === 'video');
      const postsWithUrl = videoPosts.filter((p) => p.mediaUrl);

      results.push({
        step: 'Apify Fetch',
        success: true,
        details: `Found ${content.posts.length} posts, ${videoPosts.length} videos, ${postsWithUrl.length} with URLs (${fetchTime}s)`,
        data: { posts: content.posts },
      });

      console.log(`  ✓ Found ${content.posts.length} posts in ${fetchTime}s`);
      console.log(`    - Videos: ${videoPosts.length}`);
      console.log(`    - Videos with URLs: ${postsWithUrl.length}`);

      if (postsWithUrl.length === 0) {
        console.log('  ✗ No videos with downloadable URLs found');
        printResults(results);
        process.exit(1);
      }

      // Step 2: Download first video
      const videoPost = postsWithUrl[0];
      console.log('\n[Step 2] Downloading video...');
      console.log(`  Post ID: ${videoPost.id}`);
      console.log(`  URL: ${videoPost.mediaUrl!.slice(0, 80)}...`);

      const downloadStartTime = Date.now();
      const videoData = await downloadVideo(videoPost.mediaUrl!);
      const downloadTime = ((Date.now() - downloadStartTime) / 1000).toFixed(1);

      if (!videoData) {
        results.push({
          step: 'Video Download',
          success: false,
          details: 'Download failed - check console for details',
        });
        console.log('  ✗ Download failed');
        console.log('\n  Possible causes:');
        console.log('    - CDN URL expired (Instagram URLs expire after ~1 hour)');
        console.log('    - Server blocked the request');
        console.log('    - Invalid or corrupted URL');
      } else {
        const sizeMB = (videoData.buffer.length / 1024 / 1024).toFixed(2);
        results.push({
          step: 'Video Download',
          success: true,
          details: `Downloaded ${sizeMB}MB, type: ${videoData.contentType} (${downloadTime}s)`,
          data: { buffer: videoData.buffer, contentType: videoData.contentType },
        });

        console.log(`  ✓ Downloaded successfully in ${downloadTime}s`);
        console.log(`    - Size: ${sizeMB}MB`);
        console.log(`    - Content-Type: ${videoData.contentType}`);

        // Step 3: Upload to Twelve Labs
        console.log('\n[Step 3] Analyzing with Twelve Labs...');
        const analysisStartTime = Date.now();

        try {
          const analysisResult = await analyzeVideoWithOptions(
            videoPost.mediaUrl!,
            videoData.buffer,
            { tier: 'full' },
            videoData.contentType
          );

          const analysisTime = ((Date.now() - analysisStartTime) / 1000).toFixed(1);

          if (!analysisResult) {
            results.push({
              step: 'Twelve Labs Analysis',
              success: false,
              details: 'Analysis returned null - check console for details',
            });
            console.log('  ✗ Analysis failed');
          } else {
            results.push({
              step: 'Twelve Labs Analysis',
              success: true,
              details: `Indexed video ${analysisResult.indexInfo.videoId}, ` +
                `duration: ${analysisResult.indexInfo.duration?.toFixed(1) || 'unknown'}s (${analysisTime}s)`,
              data: analysisResult,
            });

            console.log(`  ✓ Analysis completed in ${analysisTime}s`);
            console.log(`    - Video ID: ${analysisResult.indexInfo.videoId}`);
            console.log(`    - Duration: ${analysisResult.indexInfo.duration?.toFixed(1) || 'unknown'}s`);
            console.log(`    - Transcript: ${analysisResult.transcript.text.length} chars`);
            console.log(`    - Brands detected: ${analysisResult.visualAnalysis.brands.length}`);
            console.log(`    - Logo detections: ${analysisResult.logoDetections?.length || 0}`);
            console.log(`    - Safety rating: ${analysisResult.visualAnalysis.brandSafetyRating}`);

            if (analysisResult.contentClassification) {
              console.log(`    - Safety score: ${(analysisResult.contentClassification.overallSafetyScore * 100).toFixed(0)}%`);
            }

            // Display new safety rationale if available
            const rationale = analysisResult.visualAnalysis.safetyRationale;
            if (rationale) {
              console.log('\n  Safety Analysis:');
              console.log(`    Summary: ${rationale.summary || 'No summary provided'}`);

              if (rationale.evidence && rationale.evidence.length > 0) {
                console.log(`\n    Evidence (${rationale.evidence.length} items):`);
                for (const e of rationale.evidence) {
                  const mins = Math.floor(e.timestamp / 60);
                  const secs = Math.floor(e.timestamp % 60);
                  const ts = `${mins}:${secs.toString().padStart(2, '0')}`;
                  console.log(`      [${ts}] ${e.category.toUpperCase()} (${e.severity}): ${e.quote || e.description}`);
                  if (e.context) {
                    console.log(`             Context: ${e.context}`);
                  }
                }
              } else {
                console.log('    Evidence: None (video appears safe)');
              }

              console.log('\n    Category Scores:');
              const scores = rationale.categoryScores;
              for (const [category, data] of Object.entries(scores)) {
                const score = data as { score: number; reason: string };
                console.log(`      ${category}: ${score.score}/100 - ${score.reason}`);
              }
            }
          }
        } catch (error) {
          results.push({
            step: 'Twelve Labs Analysis',
            success: false,
            details: `Error: ${error instanceof Error ? error.message : String(error)}`,
          });
          console.log(`  ✗ Analysis error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    results.push({
      step: 'Apify Fetch',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
    console.log(`  ✗ Fetch error: ${error instanceof Error ? error.message : String(error)}`);
  }

  printResults(results);
}

function printResults(results: StepResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('PIPELINE TEST SUMMARY');
  console.log('='.repeat(60));

  const allSuccess = results.every((r) => r.success);

  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    console.log(`\n${status} ${result.step}`);
    console.log(`  ${result.details}`);
  }

  console.log('\n' + '='.repeat(60));

  if (allSuccess) {
    console.log('✓ ALL STEPS PASSED - Pipeline is working correctly');
    console.log('\nCheck your Twelve Labs dashboard to verify the video was indexed:');
    console.log('  https://playground.twelvelabs.io/indexes');
  } else {
    console.log('✗ PIPELINE FAILED - Check the step(s) marked with ✗ above');
    console.log('\nDebugging tips:');
    console.log('  1. Check if CDN URLs have expired (fetch new posts)');
    console.log('  2. Verify API keys are valid');
    console.log('  3. Check console output above for detailed error messages');
  }

  console.log('='.repeat(60) + '\n');

  process.exit(allSuccess ? 0 : 1);
}

main();
