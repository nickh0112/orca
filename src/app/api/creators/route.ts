import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/creators - List all creators with their reports
export async function GET() {
  try {
    const creators = await db.creator.findMany({
      include: {
        report: {
          select: {
            id: true,
            riskLevel: true,
            findings: true,
            createdAt: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(creators);
  } catch (error) {
    console.error('Failed to fetch creators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}
