#!/usr/bin/env npx tsx
/**
 * Full integration test: Apify → Download → Twelve Labs
 *
 * Uses yt-dlp to download TikTok videos when direct URLs aren't available.
 *
 * Usage:
 *   npx tsx scripts/test-full-pipeline.ts @tiktok_handle
 */

import 'dotenv/config';
import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  isApifyConfigured,
  fetchTikTokViaApify,
} from '../src/lib/social-media/apify';
import {
  isTwelveLabsConfigured,
  analyzeVideo,
  formatVisualAnalysisForPrompt,
  formatLogoDetections,
  formatContentClassification,
} from '../src/lib/video-analysis';

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTimestamp(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Download TikTok video using yt-dlp
 */
async function downloadTikTokVideo(
  videoUrl: string
): Promise<{ filePath: string; buffer: Buffer } | null> {
  const tmpDir = os.tmpdir();
  const outputPath = path.join(tmpDir, `tiktok_${Date.now()}.mp4`);

  console.log(`[Download] Downloading video with yt-dlp...`);
  console.log(`[Download] URL: ${videoUrl}`);

  try {
    // Use yt-dlp to download the video
    execSync(
      `yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" "${videoUrl}" --quiet --no-warnings`,
      { timeout: 60000, stdio: 'pipe' }
    );

    if (!fs.existsSync(outputPath)) {
      console.log('[Download] Video file not found after download');
      return null;
    }

    const buffer = fs.readFileSync(outputPath);
    console.log(`[Download] Downloaded ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);

    return { filePath: outputPath, buffer };
  } catch (error) {
    console.error('[Download] yt-dlp error:', error);
    return null;
  }
}

/**
 * Clean up temporary files
 */
function cleanup(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[Cleanup] Removed temporary file');
    }
  } catch {
    // Ignore cleanup errors
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: npx tsx scripts/test-full-pipeline.ts @tiktok_handle');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/test-full-pipeline.ts @charlidamelio');
    process.exit(1);
  }

  // Check configurations
  if (!isApifyConfigured()) {
    console.error('Error: APIFY_API_KEY is not configured in .env');
    process.exit(1);
  }

  if (!isTwelveLabsConfigured()) {
    console.error('Error: TWELVE_LABS_API_KEY is not configured in .env');
    process.exit(1);
  }

  // Check for yt-dlp
  try {
    execSync('which yt-dlp', { stdio: 'pipe' });
  } catch {
    console.error('Error: yt-dlp is not installed');
    console.log('Install with: brew install yt-dlp');
    process.exit(1);
  }

  const handle = args[0].replace('@', '');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`FULL PIPELINE TEST: Apify → yt-dlp → Twelve Labs`);
  console.log(`TikTok Handle: @${handle}`);
  console.log(`${'='.repeat(60)}\n`);

  let tempFilePath: string | null = null;

  try {
    // Step 1: Fetch posts via Apify
    console.log('[Step 1] Fetching TikTok posts via Apify...');
    const startApify = Date.now();

    const content = await fetchTikTokViaApify(handle, 3);

    console.log(`[Step 1] Completed in ${((Date.now() - startApify) / 1000).toFixed(1)}s`);

    if (content.error) {
      console.error(`[Step 1] Error: ${content.error}`);
      process.exit(1);
    }

    const videoPosts = content.posts.filter(
      (p) => p.mediaType === 'video' && p.permalink
    );
    console.log(`[Step 1] Found ${videoPosts.length} videos\n`);

    if (videoPosts.length === 0) {
      console.error('No videos found. Cannot test integration.');
      process.exit(1);
    }

    // Step 2: Select a video and download it
    console.log('[Step 2] Selecting video for analysis...');
    const testVideo = videoPosts[0];
    console.log(`[Step 2] Video ID: ${testVideo.id}`);
    console.log(`[Step 2] Caption: ${testVideo.caption.slice(0, 60)}...`);
    console.log(`[Step 2] Engagement: ${JSON.stringify(testVideo.engagement)}`);
    console.log(`[Step 2] Permalink: ${testVideo.permalink}\n`);

    // Step 3: Download the video using yt-dlp
    console.log('[Step 3] Downloading video with yt-dlp...');
    const startDownload = Date.now();

    const downloadResult = await downloadTikTokVideo(testVideo.permalink);

    if (!downloadResult) {
      console.error('[Step 3] Failed to download video');
      process.exit(1);
    }

    tempFilePath = downloadResult.filePath;
    console.log(`[Step 3] Downloaded in ${((Date.now() - startDownload) / 1000).toFixed(1)}s\n`);

    // Step 4: Analyze with Twelve Labs (using buffer upload)
    console.log('[Step 4] Analyzing video with Twelve Labs...');
    const startTwelveLabs = Date.now();

    const result = await analyzeVideo(testVideo.permalink, downloadResult.buffer);

    console.log(
      `[Step 4] Completed in ${((Date.now() - startTwelveLabs) / 1000).toFixed(1)}s\n`
    );

    if (!result) {
      console.error('[Step 4] Twelve Labs analysis failed');
      process.exit(1);
    }

    // Display results
    console.log('='.repeat(60));
    console.log('ANALYSIS RESULTS');
    console.log('='.repeat(60));

    console.log('\n[Video Info]');
    console.log(`  TikTok ID: ${testVideo.id}`);
    console.log(`  Caption: ${testVideo.caption.slice(0, 100)}${testVideo.caption.length > 100 ? '...' : ''}`);
    console.log(`  Date: ${new Date(testVideo.timestamp).toLocaleDateString()}`);
    console.log(`  Views: ${testVideo.engagement.views?.toLocaleString() || 'N/A'}`);
    console.log(`  Likes: ${testVideo.engagement.likes?.toLocaleString() || 'N/A'}`);

    console.log('\n[Twelve Labs Index]');
    console.log(`  Index ID: ${result.indexInfo.indexId}`);
    console.log(`  Video ID: ${result.indexInfo.videoId}`);
    console.log(`  Status: ${result.indexInfo.status}`);
    if (result.indexInfo.duration) {
      console.log(`  Duration: ${result.indexInfo.duration.toFixed(1)}s`);
    }

    console.log('\n[Transcript]');
    if (result.transcript.text) {
      const truncated = result.transcript.text.slice(0, 400);
      console.log(`  Length: ${result.transcript.text.length} chars`);
      console.log(`  Segments: ${result.transcript.segments?.length || 0}`);
      console.log(`\n  Text: "${truncated}${result.transcript.text.length > 400 ? '...' : ''}"`);
    } else {
      console.log('  No speech detected in video');
    }

    console.log('\n[Visual Analysis]');
    console.log(`  Description: ${result.visualAnalysis.description}`);
    console.log(`  Safety Rating: ${result.visualAnalysis.brandSafetyRating.toUpperCase()}`);

    if (result.visualAnalysis.brands.length > 0) {
      console.log(`\n  Brands Detected (${result.visualAnalysis.brands.length} total):`);
      result.visualAnalysis.brands.forEach((b) => {
        let line = `    - ${b.brand} (${b.confidence} confidence)`;
        if (b.startTime !== undefined && b.endTime !== undefined) {
          const start = formatTimestamp(b.startTime);
          const end = formatTimestamp(b.endTime);
          line += ` [${start}-${end}]`;
        }
        if (b.detectionMethod) {
          line += ` via ${b.detectionMethod}`;
        }
        if (b.appearsSponsor) {
          line += ' [LIKELY SPONSOR]';
        }
        console.log(line);
      });
    }

    // Show logo detections from Search API
    if (result.logoDetections && result.logoDetections.length > 0) {
      console.log(`\n[Logo Detections via Search API] (${result.logoDetections.length} unique logos)`);
      result.logoDetections.forEach((logo) => {
        const sponsorFlag = logo.likelySponsor ? ' [LIKELY SPONSOR]' : '';
        console.log(`  ${logo.brand}${sponsorFlag} - ${logo.totalDuration.toFixed(1)}s total visibility`);
        logo.appearances.forEach((app) => {
          const start = formatTimestamp(app.startTime);
          const end = formatTimestamp(app.endTime);
          const confidence = (app.confidence * 100).toFixed(0);
          const prominence = app.prominence ? ` (${app.prominence})` : '';
          console.log(`    - ${start}-${end}: ${confidence}% confidence${prominence}`);
        });
      });
    }

    // Show content classification
    if (result.contentClassification) {
      console.log(`\n[Content Classification]`);
      console.log(`  Safety Score: ${(result.contentClassification.overallSafetyScore * 100).toFixed(0)}%`);
      if (result.contentClassification.labels.length > 0) {
        console.log('  Labels:');
        result.contentClassification.labels.forEach((label) => {
          const confidence = (label.confidence * 100).toFixed(0);
          console.log(`    - ${label.label}: ${confidence}% confidence`);
        });
      }
    }

    if (result.visualAnalysis.actions.length > 0) {
      console.log(`\n  Actions Detected:`);
      result.visualAnalysis.actions.forEach((a) => {
        const flag = a.isConcerning ? ' ⚠️' : '';
        console.log(`    - ${a.action}${flag}`);
      });
    }

    if (result.visualAnalysis.textInVideo.length > 0) {
      console.log(`\n  On-Screen Text:`);
      result.visualAnalysis.textInVideo.forEach((t) => {
        console.log(`    - "${t.text}"`);
      });
    }

    console.log(`\n  Scene Context:`);
    console.log(`    Setting: ${result.visualAnalysis.sceneContext.setting}`);
    console.log(`    Mood: ${result.visualAnalysis.sceneContext.mood}`);
    console.log(`    Content Type: ${result.visualAnalysis.sceneContext.contentType}`);

    if (result.visualAnalysis.sceneContext.concerns.length > 0) {
      console.log(`    Concerns: ${result.visualAnalysis.sceneContext.concerns.join(', ')}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('FORMATTED OUTPUT FOR CLAUDE PROMPT');
    console.log('='.repeat(60));
    console.log(formatVisualAnalysisForPrompt(result.visualAnalysis));

    console.log('\n' + '='.repeat(60));
    console.log('✓ FULL PIPELINE TEST PASSED');
    console.log('='.repeat(60));
    console.log('\nVerification Summary:');
    console.log('  ✓ Apify TikTok scraper: Working');
    console.log('  ✓ Video download (yt-dlp): Working');
    console.log('  ✓ Twelve Labs indexing: Working');
    console.log('  ✓ Transcript extraction: ' + (result.transcript.text ? 'Speech detected' : 'No speech (expected for some videos)'));
    console.log('  ✓ Visual analysis: Working');
    console.log('  ✓ Logo detection (Search API): ' + (result.logoDetections && result.logoDetections.length > 0 ? `${result.logoDetections.length} logos found` : 'No logos detected'));
    console.log('  ✓ Content classification: ' + (result.contentClassification ? `Safety score ${(result.contentClassification.overallSafetyScore * 100).toFixed(0)}%` : 'Not available'));
    console.log('  ✓ Brand safety rating: ' + result.visualAnalysis.brandSafetyRating.toUpperCase());
    console.log('  ✓ Total brands detected: ' + result.visualAnalysis.brands.length);

    // Highlight sponsors
    const sponsors = result.visualAnalysis.brands.filter(b => b.appearsSponsor);
    if (sponsors.length > 0) {
      console.log('  ✓ Likely sponsors detected: ' + sponsors.map(s => s.brand).join(', '));
    }
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (tempFilePath) {
      cleanup(tempFilePath);
    }
  }
}

main();
