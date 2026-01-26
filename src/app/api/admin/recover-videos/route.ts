import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { listIndexedVideos, recoverVideoAnalysis } from '@/lib/video-analysis/twelve-labs';

/**
 * GET /api/admin/recover-videos
 * Lists all videos indexed in Twelve Labs and creators stuck in PROCESSING/PENDING
 * Used to identify videos that were indexed but not saved to the database
 */
export async function GET() {
  try {
    // List all indexed videos from Twelve Labs
    const videos = await listIndexedVideos();

    // Find creators stuck in PROCESSING or PENDING status
    const stuckCreators = await db.creator.findMany({
      where: {
        status: { in: ['PROCESSING', 'PENDING'] },
      },
      include: {
        report: {
          select: {
            id: true,
            riskLevel: true,
            rawResults: true,
          },
        },
        attachments: {
          where: {
            type: { contains: 'video' },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Check if rawResults contains social media data
    const creatorsWithStatus = stuckCreators.map(c => {
      let hasSocialMediaData = false;
      if (c.report?.rawResults) {
        try {
          const raw = JSON.parse(c.report.rawResults);
          hasSocialMediaData = !!(raw.instagram || raw.youtube || raw.tiktok);
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        hasReport: !!c.report,
        hasSocialMediaData,
        socialLinks: c.socialLinks,
        updatedAt: c.updatedAt,
        attachmentCount: c.attachments.length,
      };
    });

    return NextResponse.json({
      indexedVideos: videos.length,
      stuckCreators: stuckCreators.length,
      videos: videos.slice(0, 50), // Return first 50 videos
      creators: creatorsWithStatus,
    });
  } catch (error) {
    console.error('Failed to fetch recovery data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recovery data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/recover-videos
 * Recover analysis for a specific video and optionally link to a creator
 *
 * Body:
 * - videoId: Twelve Labs video ID
 * - creatorId: (optional) Creator ID to update with recovered data
 */
export async function POST(request: NextRequest) {
  try {
    const { videoId, creatorId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'videoId is required' },
        { status: 400 }
      );
    }

    // Recover analysis for the video
    const analysis = await recoverVideoAnalysis(videoId);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Recovery failed - could not get transcript or analysis' },
        { status: 500 }
      );
    }

    const logoDetections = analysis.logoDetections || [];
    const contentClassification = analysis.contentClassification || { overallSafetyScore: 0.5 };

    const result = {
      success: true,
      videoId,
      transcriptLength: analysis.transcript.text.length,
      transcriptPreview: analysis.transcript.text.slice(0, 500),
      brandsDetected: logoDetections.length,
      brands: logoDetections.map(l => l.brand),
      safetyRating: analysis.visualAnalysis.brandSafetyRating,
      safetyScore: contentClassification.overallSafetyScore,
      creatorUpdated: false,
    };

    // If creatorId provided, update the creator's report
    if (creatorId) {
      const creator = await db.creator.findUnique({
        where: { id: creatorId },
        include: { report: true },
      });

      if (!creator) {
        return NextResponse.json(
          { ...result, warning: 'Creator not found' }
        );
      }

      // Build the video analysis data to merge into rawResults
      const videoData = {
        transcript: analysis.transcript.text,
        visualAnalysis: analysis.visualAnalysis,
        logoDetections: analysis.logoDetections,
        contentClassification: analysis.contentClassification,
        indexInfo: analysis.indexInfo,
        recoveredAt: new Date().toISOString(),
      };

      if (creator.report) {
        // Update existing report
        let existingRaw: Record<string, unknown> = {};
        try {
          existingRaw = JSON.parse(creator.report.rawResults);
        } catch {
          // Start fresh if parse fails
        }

        await db.report.update({
          where: { id: creator.report.id },
          data: {
            rawResults: JSON.stringify({
              ...existingRaw,
              recoveredVideoAnalysis: videoData,
            }),
            updatedAt: new Date(),
          },
        });

        result.creatorUpdated = true;
      } else {
        // Create new report with recovered data
        await db.report.create({
          data: {
            creatorId: creator.id,
            findings: JSON.stringify([]),
            rawResults: JSON.stringify({
              recoveredVideoAnalysis: videoData,
            }),
            searchQueries: JSON.stringify([]),
          },
        });

        result.creatorUpdated = true;
      }

      // Update creator status if it was stuck
      if (creator.status === 'PROCESSING' || creator.status === 'PENDING') {
        await db.creator.update({
          where: { id: creatorId },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to recover video:', error);
    return NextResponse.json(
      { error: 'Failed to recover video analysis' },
      { status: 500 }
    );
  }
}
