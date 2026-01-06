import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/batches/[batchId]/process - Start processing a batch
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;

    const batch = await db.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Batch is already processing or completed' },
        { status: 400 }
      );
    }

    // Update batch status to processing
    await db.batch.update({
      where: { id: batchId },
      data: { status: 'PROCESSING' },
    });

    return NextResponse.json({ success: true, message: 'Processing started' });
  } catch (error) {
    console.error('Failed to start processing:', error);
    return NextResponse.json(
      { error: 'Failed to start processing' },
      { status: 500 }
    );
  }
}
