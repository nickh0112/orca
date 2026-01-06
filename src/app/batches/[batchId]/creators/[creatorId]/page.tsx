'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Search } from 'lucide-react';
import { RiskBadge } from '@/components/report/risk-badge';
import { FindingCard } from '@/components/report/finding-card';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { getPlatformFromUrl } from '@/lib/utils';
import type { Finding, RiskLevel } from '@/types';

interface CreatorData {
  id: string;
  name: string;
  socialLinks: string[];
  status: string;
  batch: {
    id: string;
    name: string;
  };
  report: {
    id: string;
    riskLevel: RiskLevel;
    summary: string | null;
    findings: Finding[];
    searchQueries: string[];
    createdAt: string;
  } | null;
}

export default function CreatorReportPage({
  params,
}: {
  params: Promise<{ batchId: string; creatorId: string }>;
}) {
  const { batchId, creatorId } = use(params);
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/creators/${creatorId}`)
      .then((res) => res.json())
      .then((data) => {
        setCreator(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [creatorId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Creator not found</p>
          <Link
            href={`/batches/${batchId}`}
            className="text-zinc-300 hover:text-white"
          >
            Back to batch
          </Link>
        </div>
      </div>
    );
  }

  const { report } = creator;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link
          href={`/batches/${batchId}`}
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to {creator.batch.name}
        </Link>

        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-semibold text-zinc-50">
              {creator.name}
            </h1>
            {report && <RiskBadge level={report.riskLevel} size="lg" />}
          </div>

          {report?.summary && (
            <p className="text-zinc-400">{report.summary}</p>
          )}
        </header>

        {/* Social Links */}
        <Card className="mb-6">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
            Social Profiles
          </h2>
          <div className="flex flex-wrap gap-2">
            {creator.socialLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                {getPlatformFromUrl(link)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </Card>

        {/* Findings */}
        {report && report.findings.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-lg font-medium text-zinc-200 mb-4">
              Findings ({report.findings.length})
            </h2>
            <div className="space-y-4">
              {report.findings.map((finding, i) => (
                <FindingCard key={i} finding={finding} />
              ))}
            </div>
          </section>
        ) : (
          <Card className="mb-8 text-center py-8">
            <p className="text-zinc-400">
              No significant findings for this creator.
            </p>
          </Card>
        )}

        {/* Search Queries */}
        {report && report.searchQueries.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
                Search Queries Executed
              </h2>
            </div>
            <div className="space-y-1">
              {report.searchQueries.map((query, i) => (
                <p key={i} className="text-sm text-zinc-500 font-mono">
                  {query}
                </p>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
