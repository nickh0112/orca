import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creators/[creatorId] - Get creator with full report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;

    const creator = await db.creator.findUnique({
      where: { id: creatorId },
      include: {
        report: true,
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
        attachments: true,
      },
    });

    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Parse JSON fields
    const response = {
      ...creator,
      socialLinks: JSON.parse(creator.socialLinks),
      report: creator.report
        ? {
            ...creator.report,
            findings: JSON.parse(creator.report.findings),
            searchQueries: JSON.parse(creator.report.searchQueries),
          }
        : null,
      attachments: creator.attachments.map((att) => ({
        ...att,
        data: JSON.parse(att.data),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch creator:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creator' },
      { status: 500 }
    );
  }
}
