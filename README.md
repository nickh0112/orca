# Orca

**AI-powered creator vetting platform for brand safety analysis**

Orca helps brands and talent agencies evaluate social media influencers before partnerships. It analyzes content across Instagram, YouTube, TikTok, and web presence to identify brand safety risks, competitor partnerships, and content concerns.

## Target Users

- Talent agencies vetting creator rosters
- Brand management teams evaluating influencer partnerships
- Marketing teams conducting due diligence on creators

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Frontend | React 19, TailwindCSS 4 |
| Database | PostgreSQL (Neon) + Prisma ORM 6.2.1 |
| AI/ML | Claude (Anthropic), OpenAI Whisper, Twelve Labs |
| Queue | BullMQ + Redis (optional) |
| i18n | next-intl (English, German) |
| Visualization | Recharts, GSAP |
| PDF Export | @react-pdf/renderer |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/           # Internationalized pages
│   │   ├── batches/        # Batch management pages
│   │   │   ├── [batchId]/  # Individual batch view
│   │   │   ├── all/        # All batches list
│   │   │   └── new/        # Create new batch
│   │   └── page.tsx        # Dashboard
│   └── api/                # API routes
│       ├── batches/        # Batch CRUD & processing
│       ├── creators/       # Creator management
│       ├── dashboard/      # Dashboard statistics
│       ├── media-proxy/    # Media proxying
│       ├── upload/         # File uploads
│       └── v1/             # Public API (reports, status)
├── components/             # React components
│   ├── batch/              # Batch-related components
│   ├── dashboard/          # Dashboard widgets
│   ├── forms/              # Form components
│   ├── landing/            # Landing page components
│   ├── layout/             # Layout components
│   ├── report/             # Report display components
│   └── ui/                 # Shared UI primitives
├── lib/                    # Core business logic
│   ├── social-media/       # Platform-specific analyzers
│   ├── video-analysis/     # Video content analysis
│   ├── queue/              # BullMQ job processing
│   ├── profanity/          # Profanity detection
│   ├── transcription/      # Audio transcription
│   ├── storage/            # File storage utilities
│   └── vespa/              # Search integration
├── types/                  # TypeScript definitions
├── hooks/                  # Custom React hooks
├── messages/               # i18n translation files (en.json, de.json)
└── i18n/                   # Internationalization config
```

## Key Features

- **Batch Processing** - Analyze up to 25 creators concurrently
- **Multi-Platform Analysis** - Instagram, YouTube, TikTok, and web presence
- **AI Content Screening** - Claude Haiku for fast screening, Opus for deep analysis
- **Brand Partnership Detection** - Identifies existing brand deals and sponsorships
- **Competitor Flagging** - Detects partnerships with competitor brands
- **Risk Assessment** - Categorizes creators as LOW / MEDIUM / HIGH / CRITICAL
- **Real-Time Progress** - Server-Sent Events (SSE) for live updates
- **PDF/CSV Export** - Download reports in multiple formats
- **Internationalization** - English and German language support

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- Redis (optional, for background workers)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd orca

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Sync database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:3003`.

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database (required)
DATABASE_URL="postgresql://..."

# AI Services (required)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# Web Search (required)
EXA_API_KEY="..."

# Video Analysis (optional)
TWELVE_LABS_API_KEY="..."

# Queue/Workers (optional)
REDIS_URL="redis://..."

# Storage (optional)
BLOB_READ_WRITE_TOKEN="..."

# Social Media APIs (optional, for enhanced analysis)
INSTAGRAM_ACCESS_TOKEN="..."
YOUTUBE_API_KEY="..."
TIKTOK_API_KEY="..."
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3003 |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Sync database schema with Prisma |
| `npm run db:studio` | Open Prisma Studio for database management |
| `npm run workers` | Start background job workers |

## Architecture

### Database Schema

```
Batch (1) ──────> (*) Creator (1) ──────> (1) Report
                       │
                       └──────> (*) Attachment
```

- **Batch** - A collection of creators to analyze, with status tracking
- **Creator** - Individual creator with social links and per-platform status
- **Report** - Analysis results including risk level, findings, and raw data
- **Attachment** - Supplementary data (brand detections, statistics, etc.)

### Processing Pipeline

1. **Batch Creation** - User submits creator names and social links
2. **Platform Detection** - Parse social links to identify platforms
3. **Concurrent Analysis** - Process creators in parallel (25 max)
4. **Per-Platform Analysis** - Analyze each platform independently
   - Instagram: Posts, captions, brand tags
   - YouTube: Videos, transcripts, sponsorships
   - TikTok: Videos, captions, brand mentions
   - Web: News articles, controversy detection
5. **Risk Aggregation** - Combine findings into overall risk score
6. **Report Generation** - Create structured report with AI summary

### Risk Levels

| Level | Description |
|-------|-------------|
| LOW | No significant concerns found |
| MEDIUM | Minor issues or limited content |
| HIGH | Notable concerns requiring review |
| CRITICAL | Serious brand safety risks identified |

## API Reference

### Batches

```
POST   /api/batches              # Create a new batch
GET    /api/batches/[id]         # Get batch details
POST   /api/batches/[id]/process # Start processing a batch
GET    /api/batches/[id]/stream  # SSE stream for progress updates
GET    /api/batches/[id]/export  # Export batch as CSV
```

### Creators

```
GET    /api/creators             # List creators
GET    /api/creators/[id]        # Get creator details
```

### V1 API (Public)

```
GET    /api/v1/reports           # List reports
GET    /api/v1/reports/[id]      # Get report by ID
GET    /api/v1/status/[id]       # Get processing status
```

## Development Guidelines

### Code Organization

- **Components** follow feature-based organization (`batch/`, `report/`, etc.)
- **Shared UI** components live in `components/ui/`
- **Business logic** is separated into `lib/` modules
- **Types** are centralized in `types/` directory

### Component Conventions

- Use TypeScript for all components
- Prefer server components where possible
- Client components marked with `'use client'`
- Form handling via `react-hook-form` + `zod` validation

### Adding New Features

1. Define types in `src/types/`
2. Create business logic in `src/lib/`
3. Add API routes in `src/app/api/`
4. Build UI components in `src/components/`
5. Add translations to `src/messages/en.json` and `de.json`

### Database Changes

```bash
# After modifying prisma/schema.prisma
npm run db:push      # Apply changes to database
npm run db:generate  # Regenerate Prisma client
```

## License

Proprietary - All rights reserved
