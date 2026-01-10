import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  validateCreateReportRequest,
  buildStatusResponse,
  V1CreateReportRequest,
} from '@/lib/v1-adapter';

/**
 * POST /api/v1/reports - Create a new vetting report
 * Compatible with creator-vetting-ms API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validation = validateCreateReportRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data;

    // Build social links array from handles
    const socialLinks: string[] = [];
    if (data.instagram_handle) {
      socialLinks.push(`https://instagram.com/${data.instagram_handle}`);
    }
    if (data.youtube_handle) {
      socialLinks.push(`https://youtube.com/@${data.youtube_handle}`);
    }
    if (data.tiktok_handle) {
      socialLinks.push(`https://tiktok.com/@${data.tiktok_handle}`);
    }

    // Create or find a batch for V1 API requests
    let batch = await db.batch.findFirst({
      where: {
        name: 'V1 API Requests',
        status: 'PROCESSING',
      },
    });

    if (!batch) {
      batch = await db.batch.create({
        data: {
          name: 'V1 API Requests',
          status: 'PROCESSING',
        },
      });
    }

    // Create creator with platform statuses
    const creator = await db.creator.create({
      data: {
        name: data.creator_name,
        socialLinks: JSON.stringify(socialLinks),
        language: data.language || 'en',
        batchId: batch.id,
        status: 'PENDING',
        instagramStatus: data.instagram_handle ? 'PENDING' : 'NOT_REQUESTED',
        youtubeStatus: data.youtube_handle ? 'PENDING' : 'NOT_REQUESTED',
        tiktokStatus: data.tiktok_handle ? 'PENDING' : 'NOT_REQUESTED',
        webSearchStatus: 'PENDING',
      },
    });

    // Store custom keywords if provided
    if (data.custom_keywords && data.custom_keywords.length > 0) {
      await db.attachment.create({
        data: {
          creatorId: creator.id,
          type: 'custom-keywords',
          data: JSON.stringify(data.custom_keywords),
        },
      });
    }

    // Store brands if provided
    if (data.brands && data.brands.length > 0) {
      await db.attachment.create({
        data: {
          creatorId: creator.id,
          type: 'target-brands',
          data: JSON.stringify(data.brands),
        },
      });
    }

    // TODO: Trigger async processing (for now, use the batch stream endpoint)
    // In a full implementation, this would dispatch to a background job

    // Return status response
    const response = buildStatusResponse(creator);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('V1 API create report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/reports - List reports (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const creators = await db.creator.findMany({
      take: Math.min(limit, 100),
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    const reports = creators.map(buildStatusResponse);

    return NextResponse.json({
      reports,
      total: reports.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('V1 API list reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
