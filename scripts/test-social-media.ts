/**
 * Test script for social media vetting features
 * Run with: npx tsx scripts/test-social-media.ts
 */

import 'dotenv/config';

// Test 1: Keyword Detection (no API required)
async function testKeywordDetection() {
  console.log('\n=== Testing Keyword Detection ===\n');

  const { detectSensitiveKeywords } = await import('../src/lib/social-media/keyword-detector');

  const testCases = [
    'Just had an amazing coffee at Starbucks! ☕',
    'Check out my new video about alcohol and partying 🍺',
    'This is a controversial political take about the election',
    'Using drugs is never the answer, stay safe everyone',
    'Had a great workout today, feeling strong! 💪',
  ];

  for (const content of testCases) {
    const result = detectSensitiveKeywords(content);
    console.log(`Content: "${content.slice(0, 50)}..."`);
    console.log(`  Risk: ${result.overallRisk}`);
    console.log(`  Flags: ${result.flaggedTerms.join(', ') || 'none'}`);
    console.log('');
  }
}

// Test 2: Brand Detection (requires ANTHROPIC_API_KEY)
async function testBrandDetection() {
  console.log('\n=== Testing Brand Detection ===\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('⚠️  ANTHROPIC_API_KEY not set, skipping brand detection test');
    return;
  }

  const { detectBrands } = await import('../src/lib/social-media/brand-detector');

  const testContent = `
    OMG you guys, I'm so excited to share this! I've been using the new iPhone 15 Pro
    for a month now and it's incredible 📱 Also loving my new Nike Air Max sneakers!

    #ad #sponsored Thanks to Apple for sending this phone! Use code CREATOR20 at checkout.

    Just grabbed a Starbucks on my way to the gym wearing my Lululemon outfit 💕
  `;

  console.log('Testing content with brand mentions...');
  const result = await detectBrands(testContent, 'instagram');

  console.log(`\nIs Ad: ${result.isAd}`);
  console.log(`Ad Indicators: ${result.adIndicators.join(', ') || 'none'}`);
  console.log(`\nBrands Detected:`);
  for (const brand of result.brands) {
    console.log(`  - ${brand.brand} (${brand.confidence} confidence, sponsored: ${brand.isSponsored})`);
    console.log(`    Context: "${brand.context.slice(0, 60)}..."`);
  }
  console.log(`\nSummary: ${result.summary}`);
}

// Test 3: YouTube Transcript Fetching (requires GOOGLE_API_KEY for full test)
async function testYouTubeTranscript() {
  console.log('\n=== Testing YouTube Transcript Fetching ===\n');

  // Test the transcript API directly (no Google API key needed for transcripts)
  const YouTubeTranscriptApi = (await import('youtube-captions-api')).default;
  const api = new YouTubeTranscriptApi();

  // Use a popular video that definitely has captions
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

  console.log(`Fetching transcript for video: ${testVideoId}`);

  try {
    const transcript = await api.fetch(testVideoId, {
      languages: ['en', 'en-US', 'en-GB'],
    });

    const text = transcript.getText();
    console.log(`✅ Transcript fetched successfully!`);
    console.log(`   Length: ${text.length} characters`);
    console.log(`   Preview: "${text.slice(0, 150)}..."`);
  } catch (error) {
    console.log(`❌ Transcript fetch failed: ${error}`);
  }
}

// Test 4: Full Integration Test (requires all API keys)
async function testFullIntegration() {
  console.log('\n=== Testing Full Integration ===\n');

  const missingKeys: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) missingKeys.push('ANTHROPIC_API_KEY');
  if (!process.env.GOOGLE_API_KEY) missingKeys.push('GOOGLE_API_KEY');

  if (missingKeys.length > 0) {
    console.log(`⚠️  Missing API keys for full test: ${missingKeys.join(', ')}`);
    console.log('   Set these in your .env file to test the full pipeline');
    return;
  }

  const { fetchYouTube } = await import('../src/lib/social-media/youtube');
  const { analyzeSocialMediaContent } = await import('../src/lib/social-media/analyzer');

  // Test with a known YouTube channel
  const testHandle = 'MrBeast'; // Popular creator with lots of content

  console.log(`Fetching YouTube content for: ${testHandle}`);
  console.log('(This may take a minute...)\n');

  try {
    const content = await fetchYouTube(testHandle, 1); // Last 1 month only for speed

    console.log(`✅ Fetched ${content.posts.length} videos`);

    const postsWithTranscripts = content.posts.filter(
      (p) => p.transcript && p.transcript.length > 0
    ).length;
    console.log(`   ${postsWithTranscripts} videos have transcripts`);

    if (content.posts.length > 0) {
      console.log('\nSample post:');
      const sample = content.posts[0];
      console.log(`  Title: ${sample.caption.split('\n')[0].slice(0, 60)}...`);
      console.log(`  Has transcript: ${!!sample.transcript}`);
      if (sample.transcript) {
        console.log(`  Transcript preview: "${sample.transcript.slice(0, 100)}..."`);
      }

      // Test analysis on first 3 posts only (to save API costs)
      if (content.posts.length > 0) {
        console.log('\nRunning analysis on first 3 posts...');
        const limitedContent = { ...content, posts: content.posts.slice(0, 3) };
        const analyses = await analyzeSocialMediaContent([limitedContent], testHandle);

        if (analyses.length > 0) {
          console.log(`\n✅ Analysis complete!`);
          console.log(`   Summary: ${analyses[0].summary}`);
          console.log(`   Overall Risk: ${analyses[0].overallRisk}`);
          console.log(`   Flagged Posts: ${analyses[0].flaggedPosts.length}`);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Full integration test failed: ${error}`);
  }
}

// Main
async function main() {
  console.log('🔍 Social Media Vetting Feature Tests\n');
  console.log('Environment check:');
  console.log(`  ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GOOGLE_API_KEY: ${process.env.GOOGLE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`  FACEBOOK_ACCESS_TOKEN: ${process.env.FACEBOOK_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
  console.log(`  TIKTOK_TCM_ACCESS_TOKEN: ${process.env.TIKTOK_TCM_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);

  // Run tests
  await testKeywordDetection();
  await testYouTubeTranscript();
  await testBrandDetection();
  await testFullIntegration();

  console.log('\n✨ Tests complete!\n');
}

main().catch(console.error);
