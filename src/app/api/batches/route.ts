import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { batchSchema } from '@/lib/validators';

// GET /api/batches - List all batches
export async function GET() {
  try {
    const batches = await db.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { creators: true } },
      },
    });

    return NextResponse.json({ batches });
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

    const { name, searchTerms, userEmail, clientName, creators } = result.data;

    const batch = await db.batch.create({
      data: {
        name,
        searchTerms: searchTerms ? JSON.stringify(searchTerms) : null,
        userEmail: userEmail || null,
        clientName: clientName || null,
        creators: {
          create: creators.map((creator) => ({
            name: creator.name,
            socialLinks: JSON.stringify(creator.socialLinks),
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
      { error: 'Failed to create batch' },
      { status: 500 }
    );
  }
}
