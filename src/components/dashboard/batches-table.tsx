'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { RiskLevelBarCompact } from '@/components/ui/risk-level-bar';
import type { BatchStatus } from '@/types';

interface BatchWithCounts {
  id: string;
  name: string;
  status: BatchStatus;
  userEmail: string | null;
  clientName: string | null;
  createdAt: string;
  completedAt: string | null;
  completedCount: number;
  riskBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  _count: {
    creators: number;
  };
}

interface BatchesTableProps {
  batches: BatchWithCounts[];
  className?: string;
}

type SortField = 'name' | 'status' | 'progress' | 'highRisk' | 'date';
type SortDirection = 'asc' | 'desc';

function getStatusIcon(status: BatchStatus) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle size={14} className="text-emerald-500" />;
    case 'PROCESSING':
      return <Loader2 size={14} className="text-blue-500 animate-spin" />;
    case 'FAILED':
      return <AlertTriangle size={14} className="text-red-500" />;
    default:
      return <Clock size={14} className="text-zinc-500" />;
  }
}

function getStatusLabel(status: BatchStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'Completed';
    case 'PROCESSING':
      return 'Processing';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Pending';
  }
}

function getStatusValue(status: BatchStatus): number {
  switch (status) {
    case 'PROCESSING':
      return 3;
    case 'PENDING':
      return 2;
    case 'FAILED':
      return 1;
    case 'COMPLETED':
      return 0;
    default:
      return -1;
  }
}

function SortHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  align = 'left',
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  align?: 'left' | 'right' | 'center';
}) {
  const isActive = currentField === field;

  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors',
        align === 'right' && 'ml-auto',
        align === 'center' && 'mx-auto'
      )}
    >
      {label}
      <span className="flex flex-col">
        <ChevronUp
          size={10}
          className={cn(
            '-mb-1',
            isActive && currentDirection === 'asc' ? 'text-zinc-200' : 'text-zinc-700'
          )}
        />
        <ChevronDown
          size={10}
          className={cn(
            isActive && currentDirection === 'desc' ? 'text-zinc-200' : 'text-zinc-700'
          )}
        />
      </span>
    </button>
  );
}

export function BatchesTable({ batches, className }: BatchesTableProps) {
  const locale = useLocale();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedBatches = useMemo(() => {
    return [...batches].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = getStatusValue(a.status) - getStatusValue(b.status);
          break;
        case 'progress':
          const aProgress = a._count.creators > 0 ? a.completedCount / a._count.creators : 0;
          const bProgress = b._count.creators > 0 ? b.completedCount / b._count.creators : 0;
          comparison = aProgress - bProgress;
          break;
        case 'highRisk':
          const aHighRisk = a.riskBreakdown.critical + a.riskBreakdown.high;
          const bHighRisk = b.riskBreakdown.critical + b.riskBreakdown.high;
          comparison = aHighRisk - bHighRisk;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [batches, sortField, sortDirection]);

  if (batches.length === 0) {
    return null;
  }

  return (
    <div className={cn('border border-zinc-800 rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-[minmax(180px,1fr)_100px_100px_80px_100px_80px_100px] gap-3 px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
            <SortHeader
              label="Name"
              field="name"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Client
            </div>
            <SortHeader
              label="Status"
              field="status"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortHeader
              label="Progress"
              field="progress"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Risk
            </div>
            <SortHeader
              label="High Risk"
              field="highRisk"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
              align="center"
            />
            <SortHeader
              label="Date"
              field="date"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-800/50">
            {sortedBatches.map((batch) => {
              const highRiskCount = batch.riskBreakdown.critical + batch.riskBreakdown.high;

              return (
                <Link
                  key={batch.id}
                  href={`/${locale}/batches/${batch.id}`}
                  className="block"
                >
                  <div
                    className={cn(
                      'grid grid-cols-[minmax(180px,1fr)_100px_100px_80px_100px_80px_100px] gap-3 px-4 py-3 items-center',
                      'transition-colors hover:bg-zinc-900/30'
                    )}
                  >
                    {/* Name */}
                    <span className="text-sm text-zinc-200 truncate">
                      {batch.name}
                    </span>

                    {/* Client */}
                    <span className="text-sm text-zinc-500 truncate">
                      {batch.clientName || '—'}
                    </span>

                    {/* Status */}
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(batch.status)}
                      <span className="text-xs text-zinc-500">
                        {getStatusLabel(batch.status)}
                      </span>
                    </div>

                    {/* Progress */}
                    <span className="text-sm text-zinc-400">
                      {batch.completedCount}/{batch._count.creators}
                    </span>

                    {/* Risk */}
                    <RiskLevelBarCompact
                      critical={batch.riskBreakdown.critical}
                      high={batch.riskBreakdown.high}
                      medium={batch.riskBreakdown.medium}
                      low={batch.riskBreakdown.low}
                    />

                    {/* High Risk */}
                    <div className="text-center">
                      <span
                        className={cn(
                          'text-sm',
                          highRiskCount > 0 ? 'text-red-400' : 'text-zinc-600'
                        )}
                      >
                        {highRiskCount}
                      </span>
                    </div>

                    {/* Date */}
                    <span className="text-xs text-zinc-600">
                      {formatDate(new Date(batch.createdAt))}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
