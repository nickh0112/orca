import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
          include: {
            report: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Build CSV content
    const headers = [
      'Creator Name',
      'Social Links',
      'Risk Level',
      'Findings Count',
      'Summary',
      'Source URLs',
      'Status',
    ];

    interface Finding {
      source: {
        url: string;
        title: string;
      };
    }

    const rows = batch.creators.map((creator) => {
      const socialLinks = JSON.parse(creator.socialLinks) as string[];
      const findings: Finding[] = creator.report?.findings
        ? JSON.parse(creator.report.findings)
        : [];

      // Extract all source URLs from findings
      const sourceUrls = findings
        .map((f) => f.source?.url)
        .filter(Boolean)
        .join('; ');

      return [
        escapeCsvField(creator.name),
        escapeCsvField(socialLinks.join('; ')),
        creator.report?.riskLevel || 'UNKNOWN',
        findings.length.toString(),
        escapeCsvField(creator.report?.summary || ''),
        escapeCsvField(sourceUrls),
        creator.status,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Return CSV file
    const filename = `${batch.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Failed to export batch:', error);
    return NextResponse.json(
      { error: 'Failed to export batch' },
      { status: 500 }
    );
  }
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
