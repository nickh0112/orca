'use client';

import { useEffect, useState, useMemo, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Search, Download, CircleAlert, CircleMinus, CircleCheck } from 'lucide-react';
import { RiskBadge } from '@/components/report/risk-badge';
import { FindingCard } from '@/components/report/finding-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getPlatformFromUrl } from '@/lib/utils';
import { generateCreatorPdf } from '@/components/report/creator-pdf';
import type { Finding, RiskLevel } from '@/types';

type SeverityFilter = 'all' | 'red' | 'yellow' | 'green';

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
  const [isExporting, setIsExporting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  // Filter findings by severity
  const { filteredFindings, counts } = useMemo(() => {
    const findings = creator?.report?.findings || [];

    const counts = {
      all: findings.length,
      red: findings.filter(f => f.severity === 'critical' || f.severity === 'high').length,
      yellow: findings.filter(f => f.severity === 'medium').length,
      green: findings.filter(f => f.severity === 'low').length,
    };

    let filtered = findings;
    if (severityFilter === 'red') {
      filtered = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
    } else if (severityFilter === 'yellow') {
      filtered = findings.filter(f => f.severity === 'medium');
    } else if (severityFilter === 'green') {
      filtered = findings.filter(f => f.severity === 'low');
    }

    return { filteredFindings: filtered, counts };
  }, [creator?.report?.findings, severityFilter]);

  const handleExportPdf = async () => {
    if (!creator || !creator.report) return;

    setIsExporting(true);
    try {
      const blob = await generateCreatorPdf({
        creatorName: creator.name,
        batchName: creator.batch.name,
        socialLinks: creator.socialLinks,
        riskLevel: creator.report.riskLevel,
        summary: creator.report.summary,
        findings: creator.report.findings,
        generatedAt: new Date(),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${creator.name.replace(/[^a-z0-9]/gi, '_')}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

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
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-zinc-50">
                {creator.name}
              </h1>
              {report && <RiskBadge level={report.riskLevel} size="lg" />}
            </div>
            {report && (
              <Button
                variant="secondary"
                onClick={handleExportPdf}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Generating...' : 'Export PDF'}
              </Button>
            )}
          </div>

        </header>

        {/* AI Analysis */}
        {report?.summary && (
          <Card className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3">
              AI Analysis
            </h2>
            <div className="prose prose-invert prose-sm max-w-none">
              {report.summary.split('\n').map((line, i) => {
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={i} className="text-zinc-200 font-medium mt-4 mb-2 text-base">
                      {line.replace('## ', '')}
                    </h3>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <p key={i} className="text-zinc-400 ml-4 my-1">
                      • {line.replace('- ', '')}
                    </p>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={i} className="text-zinc-400 my-1">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </Card>
        )}

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-zinc-200">
                Findings ({report.findings.length})
              </h2>

              {/* Severity Filter */}
              <div className="flex items-center gap-1 p-1 bg-zinc-900 rounded-lg">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    severityFilter === 'all'
                      ? 'bg-zinc-700 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({counts.all})
                </button>
                <button
                  onClick={() => setSeverityFilter('red')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                    severityFilter === 'red'
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-zinc-400 hover:text-red-400'
                  }`}
                >
                  <CircleAlert className="w-3.5 h-3.5" />
                  Red ({counts.red})
                </button>
                <button
                  onClick={() => setSeverityFilter('yellow')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                    severityFilter === 'yellow'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'text-zinc-400 hover:text-yellow-400'
                  }`}
                >
                  <CircleMinus className="w-3.5 h-3.5" />
                  Yellow ({counts.yellow})
                </button>
                <button
                  onClick={() => setSeverityFilter('green')}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                    severityFilter === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : 'text-zinc-400 hover:text-green-400'
                  }`}
                >
                  <CircleCheck className="w-3.5 h-3.5" />
                  Green ({counts.green})
                </button>
              </div>
            </div>

            {filteredFindings.length > 0 ? (
              <div className="space-y-4">
                {filteredFindings.map((finding, i) => (
                  <FindingCard key={i} finding={finding} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-6">
                <p className="text-zinc-400">
                  No {severityFilter} findings.
                </p>
              </Card>
            )}
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
