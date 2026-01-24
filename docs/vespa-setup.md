# Vespa Cloud Connection Setup

## Overview

Orca integrates with Vespa Cloud to fetch video transcriptions for creators being vetted. The Vespa index is populated by a separate video-understanding-indexer pipeline.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Orca App       │────▶│  Vespa Cloud    │◀────│  Video Indexer  │
│  (this repo)    │     │  (transcripts)  │     │  Pipeline       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│  Neon PostgreSQL│                           │  Video Vespa RDS│
│  (Orca data)    │                           │  (indexer state)│
└─────────────────┘                           └─────────────────┘
```

## Vespa Endpoints

| Environment | URL | Auth |
|-------------|-----|------|
| Staging | `https://container-stage.int.infra.foam.io` | VPN required, no mTLS |
| Production | `https://c9970609.e74510b2.z.vespa-app.cloud:443` | mTLS required |

## mTLS Authentication

Production Vespa Cloud requires mutual TLS (mTLS) with client certificates.

### Required Files

1. **Certificate** (`.pem`) - Contains `-----BEGIN CERTIFICATE-----`
2. **Private Key** (`.pem`) - Contains `-----BEGIN PRIVATE KEY-----`

These must be a **matching pair** - the certificate's public key must correspond to the private key.

### Environment Variables

```bash
VESPA_URL=https://c9970609.e74510b2.z.vespa-app.cloud:443
VESPA_CERT_PATH=./your-cert.pem
VESPA_KEY_PATH=./your-key.pem
```

### Current Status

**Issue:** Certificate/key mismatch

We have:
- `nick.hensel.whalar.pem` - Private key (valid)
- `nick.hensel.whalar.cert.pem` - Certificate (valid but **doesn't match** the private key)

**Error:**
```
ERR_OSSL_X509_KEY_VALUES_MISMATCH
error:05800074:x509 certificate routines::key values mismatch
```

**Public key comparison:**
| File | Public Key Hash |
|------|-----------------|
| Certificate | `04:62:c7:e6:74...` |
| Private Key | `04:5d:81:aa:de...` |

### Resolution Needed

Get the matching certificate for `nick.hensel.whalar.pem` from Vespa Cloud console or from Chus.

Certificate fingerprint that may help identify: `66:f5:c3:64:87:42:e9:b1:6a:5f:ec:7a:cf:b6:3e:74`

## How to Get New Certificates

### Option 1: Vespa CLI
```bash
brew install vespa-cli
vespa auth login
vespa auth cert --application <tenant>.<app>.<instance>
```

Creates files at:
- `~/.vespa/<tenant>.<app>.<instance>/data-plane-public-cert.pem`
- `~/.vespa/<tenant>.<app>.<instance>/data-plane-private-key.pem`

### Option 2: Vespa Cloud Console
1. Login to Vespa Cloud
2. Navigate to your application
3. Go to Security → Data Plane Credentials
4. Download or generate new cert/key pair

## Video Vespa RDS (Separate System)

The RDS databases are for the **video indexer pipeline**, NOT for Orca:

| Environment | Host | Purpose |
|-------------|------|---------|
| Dev | `video-vespa-dev.ccjfsjmg26em.eu-west-1.rds.amazonaws.com` | Indexer state tracking |
| Prod | `video-vespa-prod.ccjfsjmg26em.eu-west-1.rds.amazonaws.com` | Indexer state tracking |

**Tables in RDS:**
- `video_assets` - Video processing queue
- `brand_extraction_queue` - Brand extraction jobs
- `platform_metric_queue` - Platform metrics
- `backfill_jobs` - Data backfill tracking
- `yoyo_*` - Migration tracking (Python yoyo)

Orca does NOT connect to this RDS. It connects to Vespa directly for transcriptions.

## Code Reference

### Vespa Client
`src/lib/vespa/index.ts`

Key functions:
- `queryTranscriptsByHandle(handle, limit, monthsBack)` - Fetch posts by creator
- `queryTranscriptsForHandles(handles, limit)` - Batch query
- `getPostById(id)` - Single post lookup
- `convertVespaPostsToSocialMediaContent(posts, handle)` - Convert to Orca format

### Data Flow
1. Orca receives creator handles for vetting
2. Calls `queryTranscriptsByHandle()` to get video transcriptions from Vespa
3. Falls back to direct API calls if Vespa returns nothing
4. Transcriptions are used for risk analysis

### Testing
```bash
npx tsx scripts/test-vespa.ts @mrbeast          # Query by handle
npx tsx scripts/test-vespa.ts --id <content_id> # Query by ID
```

## Next Steps

1. [ ] Get matching certificate for `nick.hensel.whalar.pem`
2. [ ] Test connection with `npx tsx scripts/test-vespa.ts mrbeast`
3. [ ] Verify transcription data is returned
4. [ ] Run full vetting flow with Vespa integration
