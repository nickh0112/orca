# Orca - AI Agent Knowledge Base

> **Purpose**: This document serves as persistent memory between AI agent sessions. Future Claude instances working on this codebase should read this file first and update it with new learnings before ending their session.

---

## Quick Start for AI Agents

1. **Read this file first** to understand the codebase
2. **Check recent git commits** (`git log --oneline -10`) for context
3. **Update this file** with any new learnings before your session ends
4. **Push updates** so future sessions benefit from your work

---

## Project Overview

**Orca** is a creator vetting platform that helps brands evaluate social media influencers before partnerships. It analyzes:
- Social media content (Instagram, TikTok, YouTube)
- Web presence (news articles, controversies)
- Brand partnerships and competitor relationships
- Profanity and sensitive content

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React, TailwindCSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL (Neon)
- **AI**: Claude (Anthropic) for content analysis, OpenAI Whisper for transcription
- **External APIs**: Exa (web search), Google Custom Search, Vespa (content indexing)

---

## Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── batches/       # Batch CRUD and processing
│   │   ├── creators/      # Creator data endpoints
│   │   └── v1/            # Public V1 API
│   ├── batches/           # Batch management UI
│   │   └── [batchId]/
│   │       ├── page.tsx   # Batch detail (creator list)
│   │       └── creators/
│   │           └── [creatorId]/
│   │               └── page.tsx  # Creator report (split view)
│   └── prototypes/        # UI prototypes for testing designs
├── components/            # React components
│   ├── batch/            # Batch-related components
│   ├── report/           # Report display components
│   ├── ui/               # Shared UI primitives
│   └── prototypes/       # Prototype-specific components
├── lib/                  # Core business logic
│   ├── social-media/     # Platform-specific fetchers
│   │   ├── index.ts      # fetchAllSocialMedia orchestrator
│   │   ├── instagram.ts  # Instagram Graph API
│   │   ├── youtube.ts    # YouTube Data API
│   │   ├── tiktok.ts     # TikTok API
│   │   ├── brand-detector.ts    # Brand partnership detection
│   │   └── competitor-detector.ts
│   ├── vespa/           # Vespa content index queries
│   ├── exa.ts           # Exa web search
│   ├── google-search.ts # Google Custom Search
│   ├── profanity.ts     # Profanity detection
│   └── v1-adapter.ts    # V1 API response formatting
├── hooks/               # React hooks
└── types/               # TypeScript types
```

### Key Data Flow

```
1. User creates Batch with creators
   └─> POST /api/batches

2. User starts processing
   └─> POST /api/batches/[id]/process
   └─> GET /api/batches/[id]/stream (SSE)

3. For each creator (parallel, 10 at a time):
   a. Fetch social media content
      - Try Vespa first (cached transcripts)
      - Fall back to platform APIs

   b. Analyze content
      - Profanity detection (local)
      - Brand partnership extraction (Claude Haiku)
      - Competitor detection (if clientBrand set)
      - Content safety analysis (Claude)

   c. Search web
      - Exa search for controversies
      - Google Custom Search for flagged topics

   d. Generate report
      - Aggregate findings
      - Calculate risk level
      - Generate AI summary

   e. Save results
      - Report record (findings, summary, risk)
      - Attachments (brand-partnerships, profanity, etc.)

4. UI displays results
   └─> Split view: content grid + context panel
```

---

## Database Schema

### Key Models

```prisma
model Batch {
  id          String      @id
  name        String
  status      BatchStatus  // PENDING, PROCESSING, COMPLETED, FAILED
  searchTerms String?     // Custom search terms JSON
  userEmail   String?
  clientName  String?
  creators    Creator[]
}

model Creator {
  id          String
  name        String
  socialLinks String      // JSON array of URLs
  status      CreatorStatus
  monthsBack  Int?        // How far back to analyze (1-36)
  clientBrand String?     // For competitor detection
  report      Report?
  attachments Attachment[]
}

model Report {
  id            String
  creatorId     String    @unique
  riskLevel     RiskLevel // LOW, MEDIUM, HIGH, CRITICAL, UNKNOWN
  summary       String?   // AI-generated analysis
  findings      String    // JSON array of Finding objects
  rawResults    String    // Full API responses (debug)
  searchQueries String    // Queries executed
}

model Attachment {
  id        String
  creatorId String
  type      String  // brands-instagram, profanity, brand-partnerships, etc.
  platform  String? // instagram, youtube, tiktok, web
  data      String  // JSON blob
}
```

### Finding Types

```typescript
type FindingType =
  | 'court_case'
  | 'news_article'
  | 'social_controversy'
  | 'social_post'           // Direct social media content
  | 'reddit_mention'
  | 'competitor_partnership'
  | 'other';

interface Finding {
  type: FindingType;
  title: string;
  summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: { url: string; title: string; publishedDate?: string };
  validation?: { isSamePerson: 'yes' | 'no' | 'uncertain'; confidence: string };
  socialMediaSource?: { platform: string; handle: string; postId: string; ... };
}
```

---

## Environment Variables

### Required
```bash
DATABASE_URL=         # PostgreSQL connection string
ANTHROPIC_API_KEY=    # Claude API for analysis
EXA_API_KEY=          # Exa web search
```

### Optional (for full functionality)
```bash
# Social Media APIs (if not using Vespa)
FACEBOOK_ACCESS_TOKEN=      # Instagram Graph API
FACEBOOK_REQUEST_USER_ID=   # Instagram business account
GOOGLE_API_KEY=             # YouTube Data API

# Vespa (alternative data source)
VESPA_URL=                  # Vespa search endpoint
VESPA_CERT=                 # mTLS certificate (cloud)
VESPA_KEY=                  # mTLS key (cloud)

# Google Custom Search
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=

# OpenAI (transcription)
OPENAI_API_KEY=
```

---

## Current UI Design

The report UI uses a **split-minimal** design:

### Batch List (`/batches/[batchId]`)
- Minimal table rows with status dots
- Color coding: green (approve), amber (review), red (critical)
- Columns: status dot, name, verdict, findings count

### Creator Report (`/batches/[batchId]/creators/[creatorId]`)
- **60/40 split view**
- Left panel: Content grid (social media posts)
  - Filter bar: all, flagged, by platform
  - Thumbnail grid with severity indicators
- Right panel: Context
  - Default: Summary with verdict, brands, web findings, risk breakdown
  - Selected post: Detail view with title, summary, source link

---

## Known Issues & TODOs

### Social Media Data Fetching
- **Issue**: No posts fetched when platform API credentials aren't configured
- **Status**: Waiting on devs for API access
- **Workaround**: Vespa data pipeline (needs creator content indexed)
- **Files**: `src/lib/social-media/index.ts`, individual platform files

### Brand Partnership Detection
- Works correctly but requires social media posts to analyze
- Uses Claude Haiku for cost-effective brand extraction
- Detects partnership types: sponsored, gifted, affiliate, organic

### Competitor Detection
- Works independently of social media (only needs clientBrand)
- Caches results to avoid redundant Claude calls
- Creates high-severity findings for competitor partnerships

---

## Recent Changes (Update this section!)

### 2026-01-10 - UI Cleanup to Match Minimal Design
- Updated dashboard (`/src/app/page.tsx`) with minimal design
  - Replaced StatCard components with inline stats
  - Simplified team/personal toggle styling
  - Minimal row design for recent batches with status dots
- Updated batches list (`/src/app/batches/page.tsx`)
  - Replaced BatchCard/BatchTabs with minimal row design
  - Status dots instead of icons, mine/all toggle
- Updated new batch form (`/src/app/batches/new/page.tsx`)
  - Removed Card wrapper components
  - Used `border-b border-zinc-900` for section dividers
  - Simpler collapsible sections

### 2026-01-09 - Split Minimal UI Implementation
- Created 5 split view prototypes for testing different aesthetics
- Implemented split-minimal design on actual batch and creator pages
- Added brand partnerships section to creator report
- Added attachments to creator API response

### Previous
- Brand partnership history feature (competitor detection)
- V1 API with brand_analysis response
- Profanity detection with multi-language support
- Google Custom Search integration

---

## Tips for Future Sessions

1. **Check Vespa data availability**: Query Vespa staging before assuming API issues
   ```bash
   curl -X POST "https://container-stage.int.infra.foam.io/search/" \
     -H "Content-Type: application/json" \
     -d '{"yql": "select id from sources post where handle contains \"username\" limit 5"}'
   ```

2. **Debug missing data**: Check `report.rawResults` in database for full API responses

3. **Test brand detection**: Look at `attachments` table for `brand-partnerships` type

4. **UI development**: Use `/prototypes` routes for testing new designs with dummy data

5. **Database queries**: Use Prisma directly in Node.js for quick debugging:
   ```javascript
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   // ... query here
   ```

---

## Instructions for Updating This Document

When you discover something new about the codebase:

1. **Add it to the relevant section** above
2. **Update "Recent Changes"** with today's date and a summary
3. **Add to "Known Issues"** if you find bugs or limitations
4. **Document workarounds** you discover
5. **Commit and push** so the next session has your learnings

```bash
git add agents.md
git commit -m "Update agents.md with [your learnings]"
git push
```

---

*Last updated: 2026-01-10 by Claude Opus 4.5*
