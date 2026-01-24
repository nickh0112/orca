'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Instagram,
  Youtube,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskLevelBarCompact } from '@/components/ui/risk-level-bar';
import { FilterChips, type ActiveFilter, type FilterCategory } from '@/components/ui/filter-chips';
import { Button } from '@/components/ui/button';
import type { RiskLevel, CreatorStatus, Severity, Finding } from '@/types';

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

interface CreatorData {
  id: string;
  name: string;
  status: CreatorStatus;
  socialLinks: string;
  report?: {
    id: string;
    riskLevel: RiskLevel;
    summary: string | null;
    findings?: string;
  } | null;
}

interface BatchTableProps {
  creators: CreatorData[];
  batchId: string;
  streamResultsMap?: Map<string, {
    status: string;
    riskLevel?: RiskLevel;
    findingsCount?: number;
  }>;
  className?: string;
}

type SortField = 'name' | 'riskLevel' | 'highRisk' | 'riskyPosts';
type SortDirection = 'asc' | 'desc';

function getPlatformsFromLinks(socialLinks: string): string[] {
  const platforms: string[] = [];
  const links = socialLinks.toLowerCase();

  if (links.includes('instagram.com') || links.includes('@instagram')) {
    platforms.push('instagram');
  }
  if (links.includes('tiktok.com') || links.includes('@tiktok')) {
    platforms.push('tiktok');
  }
  if (links.includes('youtube.com') || links.includes('@youtube')) {
    platforms.push('youtube');
  }

  return platforms;
}

function parseFindingsCounts(findingsStr: string | undefined): {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  if (!findingsStr) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };

  try {
    const findings: Finding[] = JSON.parse(findingsStr);
    const counts = { critical: 0, high: 0, medium: 0, low: 0, total: findings.length };

    findings.forEach((f) => {
      switch (f.severity) {
        case 'critical':
          counts.critical++;
          break;
        case 'high':
          counts.high++;
          break;
        case 'medium':
          counts.medium++;
          break;
        case 'low':
          counts.low++;
          break;
      }
    });

    return counts;
  } catch {
    return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  }
}

function getRiskValue(riskLevel: RiskLevel | undefined): number {
  switch (riskLevel) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    case 'LOW':
      return 1;
    default:
      return 0;
  }
}

function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'instagram':
      return <Instagram size={14} className="text-pink-400" />;
    case 'tiktok':
      return <TikTokIcon className="w-3.5 h-3.5 text-zinc-300" />;
    case 'youtube':
      return <Youtube size={14} className="text-red-500" />;
    default:
      return null;
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

export function BatchTable({
  creators,
  batchId,
  streamResultsMap,
  className,
}: BatchTableProps) {
  const locale = useLocale();
  const t = useTranslations('batchTable');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [sortField, setSortField] = useState<SortField>('riskLevel');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filterCategories: FilterCategory[] = [
    {
      id: 'platform',
      label: 'Platform',
      multiSelect: true,
      options: [
        { id: 'instagram', label: 'Instagram', icon: <Instagram size={14} className="text-pink-400" /> },
        { id: 'tiktok', label: 'TikTok', icon: <TikTokIcon className="w-3.5 h-3.5" /> },
        { id: 'youtube', label: 'YouTube', icon: <Youtube size={14} className="text-red-500" /> },
      ],
    },
    {
      id: 'risk',
      label: 'Risk Level',
      multiSelect: true,
      options: [
        { id: 'critical', label: 'Critical' },
        { id: 'high', label: 'High' },
        { id: 'medium', label: 'Medium' },
        { id: 'low', label: 'Low' },
      ],
    },
    {
      id: 'status',
      label: 'Status',
      multiSelect: false,
      options: [
        { id: 'completed', label: 'Completed' },
        { id: 'processing', label: 'Processing' },
        { id: 'pending', label: 'Pending' },
        { id: 'failed', label: 'Failed' },
      ],
    },
  ];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const processedCreators = useMemo(() => {
    return creators.map((creator) => {
      const streamResult = streamResultsMap?.get(creator.id);
      const riskLevel = streamResult?.riskLevel || creator.report?.riskLevel;
      const findingsCounts = parseFindingsCounts(creator.report?.findings);
      const platforms = getPlatformsFromLinks(creator.socialLinks);

      return {
        ...creator,
        riskLevel,
        findingsCounts,
        platforms,
        effectiveStatus: streamResult?.status === 'processing' ? 'PROCESSING' : creator.status,
      };
    });
  }, [creators, streamResultsMap]);

  const filteredCreators = useMemo(() => {
    if (activeFilters.length === 0) return processedCreators;

    return processedCreators.filter((creator) => {
      // Platform filter
      const platformFilters = activeFilters
        .filter((f) => f.categoryId === 'platform')
        .map((f) => f.optionId);
      if (platformFilters.length > 0) {
        const hasMatchingPlatform = creator.platforms.some((p) =>
          platformFilters.includes(p)
        );
        if (!hasMatchingPlatform) return false;
      }

      // Risk filter
      const riskFilters = activeFilters
        .filter((f) => f.categoryId === 'risk')
        .map((f) => f.optionId.toUpperCase());
      if (riskFilters.length > 0) {
        if (!creator.riskLevel || !riskFilters.includes(creator.riskLevel)) {
          return false;
        }
      }

      // Status filter
      const statusFilter = activeFilters.find((f) => f.categoryId === 'status');
      if (statusFilter) {
        if (creator.effectiveStatus.toLowerCase() !== statusFilter.optionId) {
          return false;
        }
      }

      return true;
    });
  }, [processedCreators, activeFilters]);

  const sortedCreators = useMemo(() => {
    return [...filteredCreators].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'riskLevel':
          comparison = getRiskValue(a.riskLevel) - getRiskValue(b.riskLevel);
          break;
        case 'highRisk':
          comparison =
            a.findingsCounts.critical + a.findingsCounts.high -
            (b.findingsCounts.critical + b.findingsCounts.high);
          break;
        case 'riskyPosts':
          comparison = a.findingsCounts.total - b.findingsCounts.total;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredCreators, sortField, sortDirection]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter bar */}
      <FilterChips
        categories={filterCategories}
        activeFilters={activeFilters}
        onFiltersChange={setActiveFilters}
      />

      {/* Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[minmax(180px,1fr)_90px_130px_70px_70px_90px] gap-3 px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
          <SortHeader
            label="Creator"
            field="name"
            currentField={sortField}
            currentDirection={sortDirection}
            onSort={handleSort}
          />
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Platform
          </div>
          <SortHeader
            label="Risk Level"
            field="riskLevel"
            currentField={sortField}
            currentDirection={sortDirection}
            onSort={handleSort}
          />
          <SortHeader
            label="High Risk"
            field="highRisk"
            currentField={sortField}
            currentDirection={sortDirection}
            onSort={handleSort}
            align="center"
          />
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500 text-center">
            Subjective
          </div>
          <SortHeader
            label="Risky Posts"
            field="riskyPosts"
            currentField={sortField}
            currentDirection={sortDirection}
            onSort={handleSort}
            align="center"
          />
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-800/50">
          {sortedCreators.map((creator) => {
            const isCompleted = creator.effectiveStatus === 'COMPLETED';

            return (
              <div
                key={creator.id}
                className={cn(
                  'grid grid-cols-[minmax(180px,1fr)_90px_130px_70px_70px_90px] gap-3 px-4 py-3 items-center',
                  'transition-colors',
                  isCompleted ? 'hover:bg-zinc-900/30' : 'opacity-60'
                )}
              >
                {/* Creator */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <User size={14} className="text-zinc-500" />
                  </div>
                  <span className={cn(
                    'text-sm truncate',
                    isCompleted ? 'text-zinc-200' : 'text-zinc-500'
                  )}>
                    {creator.name}
                  </span>
                </div>

                {/* Platform */}
                <div className="flex items-center gap-1.5">
                  {creator.platforms.map((platform) => (
                    <PlatformIcon key={platform} platform={platform} />
                  ))}
                  {creator.platforms.length === 0 && (
                    <span className="text-zinc-700 text-xs">—</span>
                  )}
                </div>

                {/* Risk Level */}
                <div>
                  {isCompleted ? (
                    <RiskLevelBarCompact
                      critical={creator.findingsCounts.critical}
                      high={creator.findingsCounts.high}
                      medium={creator.findingsCounts.medium}
                      low={creator.findingsCounts.low}
                    />
                  ) : (
                    <div className="w-24 h-1.5 rounded-full bg-zinc-800" />
                  )}
                </div>

                {/* High Risk */}
                <div className="text-center">
                  <span className={cn(
                    'text-sm',
                    creator.findingsCounts.critical + creator.findingsCounts.high > 0
                      ? 'text-red-400'
                      : 'text-zinc-600'
                  )}>
                    {isCompleted
                      ? creator.findingsCounts.critical + creator.findingsCounts.high
                      : '—'}
                  </span>
                </div>

                {/* Subjective */}
                <div className="text-center">
                  <span className="text-sm text-zinc-600">
                    {isCompleted ? creator.findingsCounts.medium : '—'}
                  </span>
                </div>

                {/* Risky Posts / Action */}
                <div className="flex items-center justify-center">
                  {isCompleted ? (
                    <Link
                      href={`/${locale}/batches/${batchId}/creators/${creator.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      View
                      <ExternalLink size={10} />
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-600 capitalize">
                      {creator.effectiveStatus.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>

        {/* Empty state */}
        {sortedCreators.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-zinc-500 text-sm">
              {activeFilters.length > 0
                ? 'No creators match the selected filters'
                : 'No creators in this batch'}
            </p>
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          Showing {sortedCreators.length} of {creators.length} creators
        </span>
        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            className="hover:text-zinc-400 transition-colors"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
