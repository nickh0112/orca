/**
 * Test script for image and caption analysis
 * Run with: npx tsx scripts/test-analysis.ts
 *
 * Tests:
 * 1. Keyword Detection (local, no API required)
 * 2. Image Analysis (Claude Vision, requires ANTHROPIC_API_KEY)
 * 3. Haiku Screening (requires ANTHROPIC_API_KEY)
 * 4. Combined Analysis (image + caption together)
 * 5. Instagram Scraper Integration (requires APIFY_API_KEY, optionally ANTHROPIC_API_KEY)
 */

import 'dotenv/config';
import { detectSensitiveKeywords } from '../src/lib/social-media/keyword-detector';
import { analyzeImage, isClaudeVisionConfigured } from '../src/lib/video-analysis/image-analysis';
import { screenPostsWithHaiku } from '../src/lib/social-media/haiku-screener';
import { formatVisualAnalysisForPrompt } from '../src/lib/video-analysis';
import { fetchInstagramViaApify, isApifyConfigured } from '../src/lib/social-media/apify';
import type { SocialMediaPost } from '../src/types/social-media';

// =============================================================================
// Sample Test Data
// =============================================================================

// Publicly accessible Unsplash images for testing
const TEST_IMAGES = {
  productShot: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',  // Nike shoe
  lifestyle: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800',  // Fashion lifestyle
};

// Test captions covering various content types
const TEST_CAPTIONS = [
  {
    id: 'clean-1',
    label: 'Clean lifestyle post',
    caption: 'Just had an amazing morning workout! Feeling energized and ready to take on the day. #fitness #motivation',
  },
  {
    id: 'sponsored-1',
    label: 'Sponsored content with #ad',
    caption: 'OMG thank you @Nike for sending me these new sneakers! Use code CREATOR20 for 20% off! #ad #sponsored #gifted',
  },
  {
    id: 'alcohol-1',
    label: 'Alcohol reference',
    caption: 'Wine night with the girls! Nothing beats a good glass of wine after a long week. #winenot #girlsnight',
  },
  {
    id: 'political-1',
    label: 'Political content',
    caption: 'We need to stand up for what\'s right. Vote in the upcoming election - your voice matters! #politics #vote',
  },
  {
    id: 'controversial-1',
    label: 'Controversial topic',
    caption: 'This conspiracy about the government is getting out of control. People need to wake up! #truth',
  },
  {
    id: 'safe-1',
    label: 'Safe fitness post',
    caption: 'New personal record on my 5K run today! Consistency is key. #running #fitness #health',
  },
];

// =============================================================================
// Test Functions
// =============================================================================

/**
 * Test 1: Keyword Detection (Local, no API required)
 */
async function testKeywordDetection(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Keyword Detection (Local Processing)');
  console.log('='.repeat(60));

  for (const { id, label, caption } of TEST_CAPTIONS) {
    console.log(`\n--- ${label} (${id}) ---`);
    console.log(`Caption: "${caption.slice(0, 80)}${caption.length > 80 ? '...' : ''}"`);

    const result = detectSensitiveKeywords(caption);

    console.log(`Overall Risk: ${result.overallRisk.toUpperCase()}`);

    if (result.matches.length > 0) {
      console.log('Flagged Terms:');
      for (const match of result.matches) {
        console.log(`  - "${match.keyword}" (${match.severity}, ${match.matchType} match)`);
      }
    } else {
      console.log('Flagged Terms: None');
    }
  }

  console.log('\n[Keyword Detection] Test complete');
}

/**
 * Test 2: Image Analysis (Requires ANTHROPIC_API_KEY)
 */
async function testImageAnalysis(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Image Analysis (Claude Vision)');
  console.log('='.repeat(60));

  if (!isClaudeVisionConfigured()) {
    console.log('\nSkipped: ANTHROPIC_API_KEY not set');
    return;
  }

  for (const [name, url] of Object.entries(TEST_IMAGES)) {
    console.log(`\n--- Analyzing: ${name} ---`);
    console.log(`URL: ${url}`);

    try {
      const result = await analyzeImage(url);

      console.log(`\nDescription: ${result.description}`);
      console.log(`Brand Safety Rating: ${result.brandSafetyRating.toUpperCase()}`);

      if (result.brands.length > 0) {
        console.log('Brands Detected:');
        for (const brand of result.brands) {
          console.log(`  - ${brand.brand} (${brand.confidence} confidence)`);
        }
      } else {
        console.log('Brands Detected: None');
      }

      if (result.textInVideo.length > 0) {
        console.log('Text Extracted:');
        for (const text of result.textInVideo) {
          console.log(`  - "${text.text}"`);
        }
      } else {
        console.log('Text Extracted: None');
      }

      console.log('Scene Context:');
      console.log(`  Setting: ${result.sceneContext.setting}`);
      console.log(`  Mood: ${result.sceneContext.mood}`);
      console.log(`  Content Type: ${result.sceneContext.contentType}`);

      if (result.sceneContext.concerns.length > 0) {
        console.log(`  Concerns: ${result.sceneContext.concerns.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error analyzing ${name}:`, error);
    }
  }

  console.log('\n[Image Analysis] Test complete');
}

/**
 * Test 3: Haiku Screening (Requires ANTHROPIC_API_KEY)
 */
async function testHaikuScreening(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Haiku Screening (AI Caption Analysis)');
  console.log('='.repeat(60));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nSkipped: ANTHROPIC_API_KEY not set');
    return;
  }

  // Convert test captions to SocialMediaPost format
  const posts: SocialMediaPost[] = TEST_CAPTIONS.map(({ id, caption }) => ({
    id,
    caption,
    timestamp: new Date().toISOString(),
    permalink: `https://instagram.com/p/${id}`,
    mediaType: 'image' as const,
    engagement: {},
  }));

  console.log(`\nScreening ${posts.length} posts...`);

  try {
    const results = await screenPostsWithHaiku(posts, 'instagram', 'test_creator');

    for (const result of results) {
      const testCaption = TEST_CAPTIONS.find((c) => c.id === result.postId);
      console.log(`\n--- ${testCaption?.label || result.postId} ---`);
      console.log(`Requires Senior Review: ${result.requiresSeniorReview ? 'YES' : 'No'}`);

      if (result.potentialIssues.length > 0) {
        console.log('Potential Issues:');
        for (const issue of result.potentialIssues) {
          console.log(`  - [${issue.type}] "${issue.text}" (${issue.context})`);
        }
      } else {
        console.log('Potential Issues: None');
      }

      if (result.brandMentions.length > 0) {
        console.log(`Brand Mentions: ${result.brandMentions.join(', ')}`);
      }

      if (result.adIndicators.length > 0) {
        console.log(`Ad Indicators: ${result.adIndicators.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Haiku screening error:', error);
  }

  console.log('\n[Haiku Screening] Test complete');
}

/**
 * Test 4: Combined Analysis (Image + Caption)
 */
async function testCombinedAnalysis(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Combined Analysis (Image + Caption)');
  console.log('='.repeat(60));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nSkipped: ANTHROPIC_API_KEY not set');
    return;
  }

  const testCase = {
    caption: TEST_CAPTIONS[1].caption,  // Sponsored Nike post
    imageUrl: TEST_IMAGES.productShot,  // Nike shoe image
  };

  console.log('\n--- Test Case: Sponsored Post with Product Image ---');
  console.log(`Caption: "${testCase.caption}"`);
  console.log(`Image: ${testCase.imageUrl}`);

  try {
    // Analyze the image
    console.log('\nAnalyzing image...');
    const visualAnalysis = await analyzeImage(testCase.imageUrl);

    // Format for AI prompt (as it would be used in screening)
    console.log('\n--- Visual Analysis (formatted for AI prompt) ---');
    const formatted = formatVisualAnalysisForPrompt(visualAnalysis);
    console.log(formatted);

    // Run keyword detection on caption
    console.log('\n--- Keyword Detection on Caption ---');
    const keywordResult = detectSensitiveKeywords(testCase.caption);
    console.log(`Overall Risk: ${keywordResult.overallRisk.toUpperCase()}`);
    if (keywordResult.flaggedTerms.length > 0) {
      console.log(`Flagged Terms: ${keywordResult.flaggedTerms.join(', ')}`);
    }

    // Create a post with visual analysis attached
    const postWithVisual: SocialMediaPost = {
      id: 'combined-test',
      caption: testCase.caption,
      timestamp: new Date().toISOString(),
      permalink: 'https://instagram.com/p/combined-test',
      mediaType: 'image',
      engagement: {},
      visualAnalysis,
    };

    // Screen with Haiku (includes visual analysis)
    console.log('\n--- Haiku Screening (with visual context) ---');
    const [screeningResult] = await screenPostsWithHaiku([postWithVisual], 'instagram', 'test_creator');

    console.log(`Requires Senior Review: ${screeningResult.requiresSeniorReview ? 'YES' : 'No'}`);

    if (screeningResult.potentialIssues.length > 0) {
      console.log('Potential Issues:');
      for (const issue of screeningResult.potentialIssues) {
        console.log(`  - [${issue.type}] "${issue.text}" (${issue.location})`);
      }
    }

    if (screeningResult.brandMentions.length > 0) {
      console.log(`Brand Mentions: ${screeningResult.brandMentions.join(', ')}`);
    }

    if (screeningResult.adIndicators.length > 0) {
      console.log(`Ad Indicators: ${screeningResult.adIndicators.join(', ')}`);
    }
  } catch (error) {
    console.error('Combined analysis error:', error);
  }

  console.log('\n[Combined Analysis] Test complete');
}

/**
 * Test 5: Instagram Scraper Integration (Requires APIFY_API_KEY)
 */
async function testInstagramScraper(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Instagram Scraper Integration (Apify + Analysis)');
  console.log('='.repeat(60));

  if (!isApifyConfigured()) {
    console.log('\nSkipped: APIFY_API_KEY not set');
    return;
  }

  console.log('\nFetching posts from @alix_earle...');

  try {
    // Fetch real Instagram posts
    const content = await fetchInstagramViaApify('alix_earle', 1);

    if (content.error) {
      console.error(`\nScraper error: ${content.error}`);
      return;
    }

    // --- Scraper Results ---
    console.log('\n--- Scraper Results ---');
    console.log(`Posts fetched: ${content.posts.length}`);
    console.log(`Posts with media URLs: ${content.posts.filter((p) => p.mediaUrl).length}`);

    if (content.posts.length === 0) {
      console.log('\nNo posts returned. Account may be private or rate limited.');
      return;
    }

    // --- Sample Posts ---
    console.log('\n--- Sample Posts ---');
    const samplePosts = content.posts.slice(0, 3);
    samplePosts.forEach((post, index) => {
      console.log(`Post ${index + 1}: ${post.id} (${post.mediaType})`);
      const captionPreview = post.caption.slice(0, 80);
      console.log(`  Caption: "${captionPreview}${post.caption.length > 80 ? '...' : ''}"`);
      console.log(`  Media URL: ${post.mediaUrl ? '✓' : '✗'}`);
    });

    // --- Image Analysis (first 2 image posts) ---
    if (process.env.ANTHROPIC_API_KEY) {
      const imagePosts = content.posts.filter((p) => p.mediaType === 'image' && p.mediaUrl);

      if (imagePosts.length > 0) {
        console.log('\n--- Image Analysis (first 2 image posts) ---');
        const postsToAnalyze = imagePosts.slice(0, 2);

        for (const post of postsToAnalyze) {
          console.log(`Analyzing post ${post.id}...`);
          try {
            const result = await analyzeImage(post.mediaUrl!);
            console.log(`  Brand Safety: ${result.brandSafetyRating.toUpperCase()}`);
            console.log(`  Brands: ${result.brands.length > 0 ? result.brands.map((b) => b.brand).join(', ') : 'None detected'}`);
            console.log(`  Scene: ${result.sceneContext.contentType}`);
          } catch (error) {
            console.error(`  Error analyzing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } else {
        console.log('\n--- Image Analysis ---');
        console.log('No image posts with media URLs available for analysis');
      }
    } else {
      console.log('\n--- Image Analysis ---');
      console.log('Skipped: ANTHROPIC_API_KEY not set');
    }

    // --- Haiku Screening (real captions) ---
    if (process.env.ANTHROPIC_API_KEY) {
      console.log('\n--- Haiku Screening (real captions) ---');
      const postsToScreen = content.posts.slice(0, 5);

      try {
        const screeningResults = await screenPostsWithHaiku(postsToScreen, 'instagram', 'alix_earle');

        for (const result of screeningResults) {
          console.log(`Post ${result.postId}: Requires Review: ${result.requiresSeniorReview ? 'YES' : 'No'}`);
          if (result.potentialIssues.length > 0) {
            console.log(`  Issues: ${result.potentialIssues.map((i) => i.type).join(', ')}`);
          }
          if (result.brandMentions.length > 0) {
            console.log(`  Brand Mentions: ${result.brandMentions.join(', ')}`);
          }
        }
      } catch (error) {
        console.error(`Haiku screening error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log('\n--- Haiku Screening ---');
      console.log('Skipped: ANTHROPIC_API_KEY not set');
    }
  } catch (error) {
    console.error('Instagram scraper test error:', error);
  }

  console.log('\n[Instagram Scraper] Test complete');
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Image and Caption Analysis Test Suite');
  console.log('='.repeat(60));

  console.log('\nEnvironment:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set'}`);
  console.log(`  APIFY_API_KEY: ${process.env.APIFY_API_KEY ? 'Set' : 'Not set'}`);

  // Test 5: Instagram Scraper Integration (requires APIFY_API_KEY)
  // This test fetches real posts from Apify and runs analysis on them
  await testInstagramScraper();

  console.log('\n' + '='.repeat(60));
  console.log('All tests complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
