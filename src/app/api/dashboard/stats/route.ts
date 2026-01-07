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

    // Activity trend (last 6 months, filtered by user if specified)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const batches = await db.batch.findMany({
      where: {
        createdAt: { gte: sixMonthsAgo },
        ...userFilter,
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthCounts: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCounts[key] = 0;
    }

    for (const batch of batches) {
      const key = `${batch.createdAt.getFullYear()}-${String(batch.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (key in monthCounts) {
        monthCounts[key]++;
      }
    }

    const activityTrend = Object.entries(monthCounts).map(([month, count]) => ({
      month,
      batchCount: count,
    }));

    // Recent batches (filtered by user if specified)
    const recentBatches = await db.batch.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: userFilter,
      include: {
        _count: { select: { creators: true } },
      },
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
      activityTrend,
      recentBatches: recentBatches.map((b) => ({
        id: b.id,
        name: b.name,
        creatorCount: b._count.creators,
        userEmail: b.userEmail,
        createdAt: b.createdAt,
        status: b.status,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
