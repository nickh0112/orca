import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildFullReportResponse } from '@/lib/v1-adapter';

/**
 * GET /api/v1/reports/[id] - Get full report details
 * Compatible with creator-vetting-ms API
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch creator with report and attachments
    const creator = await db.creator.findUnique({
      where: { id },
      include: {
        report: true,
        attachments: true,
      },
    });

    if (!creator) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Build full report response
    const response = buildFullReportResponse(
      creator,
      creator.report,
      creator.attachments
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('V1 API get report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
