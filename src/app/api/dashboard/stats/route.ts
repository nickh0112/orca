import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check for user filter (personal view)
    const searchParams = request.nextUrl.searchParams;
    const userEmail = searchParams.get('userEmail');
    const userFilter = userEmail ? { userEmail } : {};
    const batchUserFilter = userEmail ? { batch: { userEmail } } : {};

    // Get current month start
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Summary stats (filtered by user if specified)
    const totalCreators = await db.creator.count({
      where: batchUserFilter,
    });

    const batchesThisMonth = await db.batch.count({
      where: {
        createdAt: { gte: monthStart },
        ...userFilter,
      },
    });

    const totalBatches = await db.batch.count({
      where: userFilter,
    });
    const completedBatches = await db.batch.count({
      where: { status: 'COMPLETED', ...userFilter },
    });
    const successRate = totalBatches > 0
      ? Math.round((completedBatches / totalBatches) * 100)
      : 100;

    // Risk distribution (filtered by user if specified)
    const riskCounts = await db.report.groupBy({
      by: ['riskLevel'],
      _count: { riskLevel: true },
      where: userEmail
        ? { creator: { batch: { userEmail } } }
        : undefined,
    });

    const riskDistribution = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const r of riskCounts) {
      if (r.riskLevel in riskDistribution) {
        riskDistribution[r.riskLevel as keyof typeof riskDistribution] = r._count.riskLevel;
      }
    }

    // Calculate average risk score (LOW=1, MEDIUM=2, HIGH=3, CRITICAL=4)
    const riskScoreMap = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4, UNKNOWN: 0 };
    const totalRiskScore = riskCounts.reduce((sum, r) => {
      return sum + (riskScoreMap[r.riskLevel as keyof typeof riskScoreMap] || 0) * r._count.riskLevel;
    }, 0);
    const totalReports = riskCounts.reduce((sum, r) => sum + r._count.riskLevel, 0);
    const avgRiskScore = totalReports > 0
      ? Math.round((totalRiskScore / totalReports) * 10) / 10
      : 0;

    // Team activity
    const teamActivity = await db.batch.groupBy({
      by: ['userEmail'],
      _count: { id: true },
      _max: { createdAt: true },
      where: {
        userEmail: { not: null },
      },
    });

    // Get creator counts per user
    const teamActivityWithCreators = await Promise.all(
      teamActivity.map(async (user) => {
        const creatorCount = await db.creator.count({
          where: {
            batch: { userEmail: user.userEmail },
          },
        });

        const completedCount = await db.batch.count({
          where: {
            userEmail: user.userEmail,
            status: 'COMPLETED',
          },
        });

        return {
          userEmail: user.userEmail || 'Unknown',
          batchCount: user._count.id,
          creatorCount,
          completionRate: user._count.id > 0
            ? Math.round((completedCount / user._count.id) * 100)
            : 0,
          lastActive: user._max.createdAt,
        };
      })
    );

    // Recent batches (filtered by user if specified)
    const recentBatches = await db.batch.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: userFilter,
      select: {
        id: true,
        name: true,
        status: true,
        userEmail: true,
        clientName: true,
        createdAt: true,
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

    // Transform to include completedCount and riskBreakdown
    const recentBatchesTransformed = recentBatches.map((batch) => {
      const completedCount = batch.creators.filter(
        (c) => c.status === 'COMPLETED'
      ).length;

      const riskBreakdown = {
        critical: batch.creators.filter((c) => c.report?.riskLevel === 'CRITICAL').length,
        high: batch.creators.filter((c) => c.report?.riskLevel === 'HIGH').length,
        medium: batch.creators.filter((c) => c.report?.riskLevel === 'MEDIUM').length,
        low: batch.creators.filter((c) => c.report?.riskLevel === 'LOW').length,
      };

      return {
        id: batch.id,
        name: batch.name,
        creatorCount: batch._count.creators,
        userEmail: batch.userEmail,
        clientName: batch.clientName,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt,
        status: batch.status,
        completedCount,
        riskBreakdown,
      };
    });

    return NextResponse.json({
      summary: {
        totalCreators,
        batchesThisMonth,
        avgRiskScore,
        successRate,
      },
      teamActivity: teamActivityWithCreators,
      riskDistribution,
      recentBatches: recentBatchesTransformed,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
