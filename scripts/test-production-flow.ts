/**
 * Production E2E Test Script
 *
 * Tests the complete pipeline from social URLs to analyzed content:
 * Social URLs -> fetchAllSocialMedia() -> Media Analysis -> analyzeSocialMediaContent() -> Report
 *
 * Run with: npx tsx scripts/test-production-flow.ts
 */

import 'dotenv/config';

// Test with a real creator
const testCreator = {
  name: 'alix_earle',
  socialLinks: [
    'https://instagram.com/alix_earle',
    'https://tiktok.com/@alix_earle',
  ],
};

function printSection(title: string) {
  console.log('\n' + '-'.repeat(50));
  console.log(title);
  console.log('-'.repeat(50));
}

function printHeader() {
  console.log('='.repeat(60));
  console.log('PRODUCTION E2E TEST');
  console.log('='.repeat(60));
}

function printEnvironment() {
  console.log('\nEnvironment:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`  APIFY_API_KEY: ${process.env.APIFY_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`  TWELVE_LABS_API_KEY: ${process.env.TWELVE_LABS_API_KEY ? 'Set' : 'Not set'}`);
}

async function main() {
  printHeader();
  printEnvironment();

  // Validate required environment
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('\nError: ANTHROPIC_API_KEY is required');
    process.exit(1);
  }

  if (!process.env.APIFY_API_KEY) {
    console.error('\nError: APIFY_API_KEY is required');
    process.exit(1);
  }

  // Import modules after dotenv is loaded
  const { fetchAllSocialMedia, analyzeSocialMediaContent } = await import(
    '../src/lib/social-media'
  );
  const { isTwelveLabsConfigured, isClaudeVisionConfigured } = await import(
    '../src/lib/video-analysis'
  );

  const twelveLabsAvailable = isTwelveLabsConfigured();
  const claudeVisionAvailable = isClaudeVisionConfigured();

  console.log(`\nMedia Analysis Config:`);
  console.log(`  Claude Vision: ${claudeVisionAvailable ? 'Available' : 'Not available'}`);
  console.log(`  Twelve Labs: ${twelveLabsAvailable ? 'Available' : 'Not available'}`);

  console.log(`\nTest Creator: ${testCreator.name}`);
  console.log(`Social Links:`);
  testCreator.socialLinks.forEach((link) => console.log(`  - ${link}`));

  // Step 1: Fetch social media content
  printSection('Step 1: Fetching Social Media Content');

  const startFetch = Date.now();
  const content = await fetchAllSocialMedia(testCreator.socialLinks, 1); // 1 month back
  const fetchDuration = ((Date.now() - startFetch) / 1000).toFixed(1);

  console.log(`\nFetch completed in ${fetchDuration}s`);

  // Summarize fetched content per platform
  let totalImages = 0;
  let totalVideos = 0;
  let totalWithVisualAnalysis = 0;
  let totalWithTranscript = 0;

  for (const source of content) {
    const images = source.posts.filter(
      (p) => p.mediaType === 'image' || p.mediaType === 'carousel'
    ).length;
    const videos = source.posts.filter((p) => p.mediaType === 'video').length;
    const withVisualAnalysis = source.posts.filter((p) => p.visualAnalysis).length;
    const withTranscript = source.posts.filter(
      (p) => p.transcript && p.transcript.trim().length > 0
    ).length;

    totalImages += images;
    totalVideos += videos;
    totalWithVisualAnalysis += withVisualAnalysis;
    totalWithTranscript += withTranscript;

    console.log(`\n[${source.platform.toUpperCase()}] @${source.handle}`);
    console.log(`  Posts fetched: ${source.posts.length}`);
    console.log(`  - Images: ${images}`);
    console.log(`  - Videos: ${videos}`);
    console.log(`  - With visual analysis: ${withVisualAnalysis}`);
    console.log(`  - With transcripts: ${withTranscript}`);

    if (source.error) {
      console.log(`  Error: ${source.error}`);
    }
  }

  // Step 2: Media Analysis Summary
  printSection('Step 2: Media Analysis Summary');

  console.log(`\nImages analyzed (Claude Vision): ${totalWithVisualAnalysis}`);
  console.log(`Videos analyzed: ${totalWithTranscript} transcripts extracted`);

  if (twelveLabsAvailable) {
    console.log(`Video analysis via: Twelve Labs`);
  } else {
    console.log(`Video analysis: Skipped (Twelve Labs not configured)`);
  }

  // Show sample visual analysis if available
  const sampleWithAnalysis = content
    .flatMap((c) => c.posts)
    .find((p) => p.visualAnalysis);

  if (sampleWithAnalysis?.visualAnalysis) {
    console.log(`\nSample Visual Analysis:`);
    const va = sampleWithAnalysis.visualAnalysis;
    console.log(`  Description: ${va.description?.slice(0, 100)}...`);
    console.log(`  Brands: ${va.brands?.map((b) => b.brand).join(', ') || 'None'}`);
    console.log(`  Safety Rating: ${va.brandSafetyRating}`);

    if (va.safetyRationale) {
      console.log(`  Safety Summary: ${va.safetyRationale.summary?.slice(0, 100)}...`);
      console.log(`  Category Scores:`);
      const scores = va.safetyRationale.categoryScores;
      if (scores) {
        Object.entries(scores).forEach(([cat, score]) => {
          if (typeof score === 'object' && score !== null && 'score' in score) {
            console.log(`    - ${cat}: ${score.score}/100`);
          }
        });
      }
    }
  }

  // Step 3: Content Screening (3-tier)
  printSection('Step 3: Content Screening (3-tier)');

  if (content.length === 0 || content.every((c) => c.posts.length === 0)) {
    console.log('\nNo content to analyze');
  } else {
    const startAnalysis = Date.now();
    const analyses = await analyzeSocialMediaContent(content, testCreator.name);
    const analysisDuration = ((Date.now() - startAnalysis) / 1000).toFixed(1);

    console.log(`\nAnalysis completed in ${analysisDuration}s`);

    // Results per platform
    for (const analysis of analyses) {
      console.log(`\n[${analysis.platform.toUpperCase()}] @${analysis.handle}`);
      console.log(`  Overall Risk: ${analysis.overallRisk}`);
      console.log(`  Flagged Posts: ${analysis.flaggedPosts.length}`);
      console.log(`  Summary: ${analysis.summary}`);

      if (analysis.flaggedPosts.length > 0) {
        console.log(`\n  Flagged Content:`);
        for (const flagged of analysis.flaggedPosts.slice(0, 5)) {
          console.log(`    - [${flagged.severity}] ${flagged.concerns.join(', ')}`);
          console.log(`      ${flagged.reason?.slice(0, 100) || 'No reason provided'}...`);
        }
        if (analysis.flaggedPosts.length > 5) {
          console.log(`    ... and ${analysis.flaggedPosts.length - 5} more`);
        }
      }
    }

    // Results Summary
    printSection('Results Summary');

    const totalPosts = content.reduce((sum, c) => sum + c.posts.length, 0);
    const totalFlagged = analyses.reduce((sum, a) => sum + a.flaggedPosts.length, 0);

    // Collect all brand mentions
    const allBrands = new Set<string>();
    for (const source of content) {
      for (const post of source.posts) {
        if (post.visualAnalysis?.brands) {
          for (const brand of post.visualAnalysis.brands) {
            allBrands.add(brand.brand);
          }
        }
      }
    }

    // Collect safety concerns
    const allConcerns: string[] = [];
    for (const analysis of analyses) {
      for (const flagged of analysis.flaggedPosts) {
        allConcerns.push(
          `[${flagged.severity}] ${flagged.concerns.join(', ')}: ${flagged.reason?.slice(0, 50) || ''}...`
        );
      }
    }

    console.log(`\nTotal Posts: ${totalPosts}`);
    console.log(`Total Flagged: ${totalFlagged}`);
    console.log(`Images Analyzed: ${totalImages}`);
    console.log(`Videos Analyzed: ${totalVideos}`);

    if (allBrands.size > 0) {
      console.log(`\nBrand Mentions:`);
      Array.from(allBrands)
        .slice(0, 10)
        .forEach((brand) => console.log(`  - ${brand}`));
      if (allBrands.size > 10) {
        console.log(`  ... and ${allBrands.size - 10} more`);
      }
    }

    if (allConcerns.length > 0) {
      console.log(`\nSafety Concerns:`);
      allConcerns.slice(0, 5).forEach((concern) => console.log(`  - ${concern}`));
      if (allConcerns.length > 5) {
        console.log(`  ... and ${allConcerns.length - 5} more`);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('E2E TEST COMPLETE');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
