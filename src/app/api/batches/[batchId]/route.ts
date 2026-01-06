import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/batches/[batchId] - Get batch details with creators
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        creators: {
          orderBy: { createdAt: 'asc' },
          include: {
            report: {
              select: {
                id: true,
                riskLevel: true,
                summary: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error('Failed to fetch batch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch' },
      { status: 500 }
    );
  }
}

// DELETE /api/batches/[batchId] - Delete a batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    await db.batch.delete({
      where: { id: batchId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete batch:', error);
    return NextResponse.json(
      { error: 'Failed to delete batch' },
      { status: 500 }
    );
  }
}
