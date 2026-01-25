import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batchSchema } from '@/lib/validators';

// GET /api/batches - List all batches
export async function GET() {
  try {
    const batches = await db.batch.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        userEmail: true,
        clientName: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        _count: { select: { creators: true } },
        creators: {
          select: {
            status: true,
            report: {
              select: {
                riskLevel: true,
              },
            },
          },
        },
      },
    });

    // Transform batches to include completedCount and riskBreakdown
    const batchesWithProgress = batches.map((batch) => {
      const completedCount = batch.creators.filter(
        (c) => c.status === 'COMPLETED'
      ).length;

      const riskBreakdown = {
        critical: batch.creators.filter((c) => c.report?.riskLevel === 'CRITICAL').length,
        high: batch.creators.filter((c) => c.report?.riskLevel === 'HIGH').length,
        medium: batch.creators.filter((c) => c.report?.riskLevel === 'MEDIUM').length,
        low: batch.creators.filter((c) => c.report?.riskLevel === 'LOW').length,
      };

      // Remove the raw creators array, keep only aggregated data
      const { creators, ...batchData } = batch;
      return {
        ...batchData,
        completedCount,
        riskBreakdown,
      };
    });

    return NextResponse.json({ batches: batchesWithProgress });
  } catch (error) {
    console.error('Failed to fetch batches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batches' },
      { status: 500 }
    );
  }
}

// POST /api/batches - Create a new batch with creators
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = batchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { name, searchTerms, userEmail, clientName, language, monthsBack, clientBrand, creators } = result.data;

    const batch = await db.batch.create({
      data: {
        name,
        searchTerms: searchTerms ? JSON.stringify(searchTerms) : null,
        userEmail: userEmail || null,
        clientName: clientName || null,
        language: language || 'en',
        creators: {
          create: creators.map((creator) => ({
            name: creator.name,
            socialLinks: JSON.stringify(creator.socialLinks),
            // Apply batch-level settings to each creator
            monthsBack: monthsBack || null,
            clientBrand: clientBrand || null,
            language: language || 'en',
          })),
        },
      },
      include: {
        _count: { select: { creators: true } },
      },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error('Failed to create batch:', error);
    return NextResponse.json(
      { error: 'Failed to create batch', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
