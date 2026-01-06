import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { searchCreator } from '@/lib/exa';
import {
  analyzeResults,
  calculateRiskLevel,
  generateSummary,
} from '@/lib/search-queries';

// GET /api/batches/[batchId]/stream - SSE stream for batch processing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const batch = await db.batch.findUnique({
          where: { id: batchId },
          include: { creators: true },
        });

        if (!batch) {
          sendEvent('error', { message: 'Batch not found' });
          controller.close();
          return;
        }

        const searchTerms = batch.searchTerms
          ? JSON.parse(batch.searchTerms)
          : [];

        // Process each creator
        for (const creator of batch.creators) {
          // Skip already completed creators
          if (creator.status === 'COMPLETED') {
            continue;
          }

          sendEvent('creator_started', {
            creatorId: creator.id,
            name: creator.name,
          });

          try {
            // Update status to processing
            await db.creator.update({
              where: { id: creator.id },
              data: { status: 'PROCESSING' },
            });

            // Perform research
            const socialLinks = JSON.parse(creator.socialLinks);
            const { results, queries } = await searchCreator(
              creator.name,
              socialLinks,
              searchTerms
            );

            // Analyze and categorize findings
            const findings = analyzeResults(results, creator.name);
            const riskLevel = calculateRiskLevel(findings);
            const summary = generateSummary(findings, riskLevel);

            // Create report
            await db.report.create({
              data: {
                creatorId: creator.id,
                riskLevel,
                summary,
                findings: JSON.stringify(findings),
                rawResults: JSON.stringify(results),
                searchQueries: JSON.stringify(queries),
              },
            });

            // Update creator status
            await db.creator.update({
              where: { id: creator.id },
              data: { status: 'COMPLETED' },
            });

            sendEvent('creator_completed', {
              creatorId: creator.id,
              name: creator.name,
              riskLevel,
              findingsCount: findings.length,
              summary,
            });
          } catch (error) {
            console.error(`Failed to process creator ${creator.name}:`, error);

            await db.creator.update({
              where: { id: creator.id },
              data: { status: 'FAILED' },
            });

            sendEvent('creator_failed', {
              creatorId: creator.id,
              name: creator.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }

          // Rate limiting delay between creators
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Mark batch as completed
        await db.batch.update({
          where: { id: batchId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        sendEvent('batch_completed', { batchId, status: 'COMPLETED' });
      } catch (error) {
        console.error('Stream error:', error);
        sendEvent('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
