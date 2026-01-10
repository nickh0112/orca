import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildStatusResponse } from '@/lib/v1-adapter';

/**
 * GET /api/v1/status/[id] - Check report processing status
 * Compatible with creator-vetting-ms API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const creator = await db.creator.findUnique({
      where: { id },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const response = buildStatusResponse(creator);
    return NextResponse.json(response);
  } catch (error) {
    console.error('V1 API get status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
