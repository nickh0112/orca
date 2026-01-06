import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';

interface CSVRow {
  name?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

// POST /api/upload - Parse CSV file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();

    return new Promise<NextResponse>((resolve) => {
      Papa.parse<CSVRow>(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const creators: { name: string; socialLinks: string[] }[] = [];
          const errors: string[] = [];

          results.data.forEach((row, index) => {
            if (!row.name?.trim()) {
              errors.push(`Row ${index + 2}: Missing name`);
              return;
            }

            const socialLinks = [
              row.instagram,
              row.twitter,
              row.youtube,
              row.tiktok,
            ].filter((link): link is string => Boolean(link?.trim()));

            if (socialLinks.length === 0) {
              errors.push(`Row ${index + 2}: No social links provided`);
              return;
            }

            creators.push({
              name: row.name.trim(),
              socialLinks,
            });
          });

          resolve(
            NextResponse.json({
              creators,
              errors: errors.length > 0 ? errors : undefined,
              totalRows: results.data.length,
              validRows: creators.length,
            })
          );
        },
        error: (error: Error) => {
          resolve(
            NextResponse.json(
              { error: `CSV parsing failed: ${error.message}` },
              { status: 400 }
            )
          );
        },
      });
    });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
