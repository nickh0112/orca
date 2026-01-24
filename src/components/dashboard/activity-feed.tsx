'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { User, CheckCircle, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface ActivityItem {
  id: string;
  type: 'creator_checked' | 'batch_started' | 'batch_completed' | 'high_risk_found';
  creatorName?: string;
  creatorId?: string;
  batchId: string;
  batchName: string;
  riskLevel?: RiskLevel;
  userEmail?: string;
  timestamp: string | Date;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

function getActivityIcon(type: ActivityItem['type'], riskLevel?: RiskLevel) {
  switch (type) {
    case 'creator_checked':
      if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
        return <AlertTriangle size={14} className="text-red-400" />;
      }
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'batch_started':
      return <Clock size={14} className="text-blue-400" />;
    case 'batch_completed':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'high_risk_found':
      return <AlertTriangle size={14} className="text-red-400" />;
    default:
      return <User size={14} className="text-zinc-500" />;
  }
}

function getActivityText(item: ActivityItem) {
  switch (item.type) {
    case 'creator_checked':
      return (
        <>
          <span className="text-zinc-300">{item.creatorName}</span>
          <span className="text-zinc-500"> was checked</span>
        </>
      );
    case 'batch_started':
      return (
        <>
          <span className="text-zinc-300">{item.batchName}</span>
          <span className="text-zinc-500"> started processing</span>
        </>
      );
    case 'batch_completed':
      return (
        <>
          <span className="text-zinc-300">{item.batchName}</span>
          <span className="text-zinc-500"> completed</span>
        </>
      );
    case 'high_risk_found':
      return (
        <>
          <span className="text-red-400">High risk</span>
          <span className="text-zinc-500"> found in </span>
          <span className="text-zinc-300">{item.creatorName}</span>
        </>
      );
    default:
      return <span className="text-zinc-500">Activity</span>;
  }
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function ActivityItemRow({ item }: { item: ActivityItem }) {
  const locale = useLocale();
  const timestamp = new Date(item.timestamp);

  const linkHref = item.creatorId
    ? `/${locale}/batches/${item.batchId}/creators/${item.creatorId}`
    : `/${locale}/batches/${item.batchId}`;

  return (
    <Link href={linkHref}>
      <div className="group flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg transition-colors hover:bg-zinc-800/50">
        {/* Icon */}
        <div className="mt-0.5 shrink-0">
          {getActivityIcon(item.type, item.riskLevel)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-snug truncate">
            {getActivityText(item)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-zinc-600 text-xs">
              {formatRelativeTime(timestamp)}
            </span>
            {item.userEmail && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-600 text-xs truncate">
                  {item.userEmail}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ArrowRight
          size={14}
          className="mt-1 shrink-0 text-zinc-700 opacity-0 group-hover:opacity-100 group-hover:text-zinc-500 transition-all"
        />
      </div>
    </Link>
  );
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className={cn('bg-zinc-900/50 border border-zinc-800 rounded-xl p-6', className)}>
        <h3 className="text-zinc-300 text-sm font-medium mb-4">Recent Activity</h3>
        <div className="py-8 text-center">
          <User size={24} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-600 text-sm">No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-zinc-900/50 border border-zinc-800 rounded-xl p-6', className)}>
      <h3 className="text-zinc-300 text-sm font-medium mb-4">Recent Activity</h3>
      <div className="divide-y divide-zinc-800/50">
        {items.map((item) => (
          <ActivityItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
