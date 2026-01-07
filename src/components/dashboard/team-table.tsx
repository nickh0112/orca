'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  userEmail: string;
  batchCount: number;
  creatorCount: number;
  completionRate: number;
  lastActive: string | null;
}

interface TeamTableProps {
  data: TeamMember[];
}

type SortKey = 'userEmail' | 'batchCount' | 'creatorCount' | 'completionRate' | 'lastActive';

export function TeamTable({ data }: TeamTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('batchCount');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];

    if (sortKey === 'lastActive') {
      aVal = aVal ? new Date(aVal as string).getTime() : 0;
      bVal = bVal ? new Date(bVal as string).getTime() : 0;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortAsc
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortAsc ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <p className="text-zinc-400">No team activity yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th
              className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('userEmail')}
            >
              Team Member
              <SortIcon column="userEmail" />
            </th>
            <th
              className="px-6 py-4 text-right text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('batchCount')}
            >
              Batches
              <SortIcon column="batchCount" />
            </th>
            <th
              className="px-6 py-4 text-right text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('creatorCount')}
            >
              Creators Vetted
              <SortIcon column="creatorCount" />
            </th>
            <th
              className="px-6 py-4 text-right text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('completionRate')}
            >
              Completion Rate
              <SortIcon column="completionRate" />
            </th>
            <th
              className="px-6 py-4 text-right text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort('lastActive')}
            >
              Last Active
              <SortIcon column="lastActive" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((member) => (
            <tr
              key={member.userEmail}
              className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30"
            >
              <td className="px-6 py-4 text-sm text-zinc-200">
                {member.userEmail}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-300 text-right">
                {member.batchCount}
              </td>
              <td className="px-6 py-4 text-sm text-zinc-300 text-right">
                {member.creatorCount}
              </td>
              <td className="px-6 py-4 text-sm text-right">
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    member.completionRate >= 90
                      ? 'bg-green-500/10 text-green-400'
                      : member.completionRate >= 70
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : 'bg-red-500/10 text-red-400'
                  )}
                >
                  {member.completionRate}%
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-zinc-400 text-right">
                {formatDate(member.lastActive)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
