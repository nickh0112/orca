import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

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

    // Parse JSON fields safely to prevent crashes on malformed data
    const response = {
      ...creator,
      socialLinks: safeJsonParse(creator.socialLinks, []),
      report: creator.report
        ? {
            ...creator.report,
            findings: safeJsonParse(creator.report.findings, []),
            searchQueries: safeJsonParse(creator.report.searchQueries, []),
          }
        : null,
      attachments: creator.attachments.map((att) => ({
        ...att,
        data: safeJsonParse(att.data, {}),
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
