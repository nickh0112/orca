/**
 * Test script for batch media analysis
 *
 * Tests the high-throughput media processing system:
 * - Batch processing of videos and images
 * - Progress tracking
 * - Retry logic on failures
 *
 * Usage:
 *   npx tsx scripts/test-batch-media.ts
 *
 * Requires environment variables:
 *   - TWELVE_LABS_API_KEY (for video analysis)
 *   - ANTHROPIC_API_KEY (for image analysis)
 */

import 'dotenv/config';
import {
  analyzeAllMedia,
  MediaAnalysisQueue,
  isMediaAnalysisAvailable,
  getAnalysisSummary,
  MediaType,
} from '../src/lib/video-analysis';

// Sample test media (replace with actual URLs for real testing)
const TEST_VIDEOS = [
  { id: 'video-1', url: 'https://example.com/video1.mp4' },
  { id: 'video-2', url: 'https://example.com/video2.mp4' },
];

const TEST_IMAGES = [
  { id: 'image-1', url: 'https://picsum.photos/800/600' },
  { id: 'image-2', url: 'https://picsum.photos/800/601' },
  { id: 'image-3', url: 'https://picsum.photos/800/602' },
];

async function main() {
  console.log('=== Batch Media Analysis Test ===\n');

  // Check configuration
  const availability = isMediaAnalysisAvailable();
  console.log('API Configuration:');
  console.log(`  Twelve Labs (video): ${availability.video ? 'YES' : 'NO'}`);
  console.log(`  Claude Vision (image): ${availability.image ? 'YES' : 'NO'}`);
  console.log('');

  if (!availability.any) {
    console.error('ERROR: No analyzers configured. Set TWELVE_LABS_API_KEY or ANTHROPIC_API_KEY.');
    process.exit(1);
  }

  // Prepare media items
  const media: Array<{ id: string; type: MediaType; url: string }> = [];

  if (availability.video) {
    for (const video of TEST_VIDEOS) {
      media.push({ ...video, type: 'video' });
    }
  }

  if (availability.image) {
    for (const image of TEST_IMAGES) {
      media.push({ ...image, type: 'image' });
    }
  }

  console.log(`Processing ${media.length} media items...`);
  console.log(`  Videos: ${media.filter(m => m.type === 'video').length}`);
  console.log(`  Images: ${media.filter(m => m.type === 'image').length}`);
  console.log('');

  const startTime = Date.now();

  // Run batch analysis
  const results = await analyzeAllMedia(media, {
    videoConcurrency: 2,
    imageConcurrency: 5,
    retries: 2,
    onProgress: (completed, total, failed) => {
      const pct = ((completed / total) * 100).toFixed(0);
      console.log(`Progress: ${completed}/${total} (${pct}%) - ${failed} failed`);
    },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('=== Results ===');
  console.log(`Total time: ${elapsed}s`);
  console.log('');

  // Get summary
  const summary = getAnalysisSummary(results);
  console.log('Summary:');
  console.log(`  Total: ${summary.total}`);
  console.log(`  Successful: ${summary.successful}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Videos: ${summary.videos}`);
  console.log(`  Images: ${summary.images}`);
  console.log(`  Brands detected: ${summary.brandsDetected}`);
  console.log(`  Average safety: ${summary.averageSafetyRating}`);
  console.log('');

  // Show individual results
  console.log('Individual Results:');
  for (const [id, result] of results) {
    if (result) {
      console.log(`  ${id}: ${result.type} - ${result.visualAnalysis.brandSafetyRating}`);
      console.log(`    Description: ${result.visualAnalysis.description.slice(0, 100)}...`);
      console.log(`    Brands: ${result.visualAnalysis.brands.map(b => b.brand).join(', ') || 'none'}`);
      if (result.transcript?.text) {
        console.log(`    Transcript: ${result.transcript.text.slice(0, 100)}...`);
      }
    } else {
      console.log(`  ${id}: FAILED`);
    }
    console.log('');
  }
}

main().catch(console.error);
