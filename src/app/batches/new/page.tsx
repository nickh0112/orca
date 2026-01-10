'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { BulkImport } from '@/components/forms/bulk-import';
import { CreatorForm } from '@/components/forms/creator-form';
import { SearchTermsInput } from '@/components/forms/search-terms-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserEmail } from '@/hooks/use-user-email';
import { cn } from '@/lib/utils';
import type { CreatorInput } from '@/lib/validators';

export default function NewBatchPage() {
  const router = useRouter();
  const { email: userEmail } = useUserEmail();
  const [batchName, setBatchName] = useState('');
  const [clientName, setClientName] = useState('');
  const [creators, setCreators] = useState<CreatorInput[]>([]);
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [monthsBack, setMonthsBack] = useState<number>(6);
  const [clientBrand, setClientBrand] = useState('');

  const handleAddCreator = (creator: CreatorInput) => {
    setCreators((prev) => [...prev, creator]);
  };

  const handleBulkImport = (imported: CreatorInput[]) => {
    setCreators((prev) => [...prev, ...imported]);
  };

  const handleRemoveCreator = (index: number) => {
    setCreators((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!batchName.trim()) {
      setError('Please enter a batch name');
      return;
    }
    if (creators.length === 0) {
      setError('Please add at least one creator');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: batchName.trim(),
          searchTerms: searchTerms.length > 0 ? searchTerms : undefined,
          userEmail: userEmail || undefined,
          clientName: clientName.trim() || undefined,
          monthsBack: monthsBack !== 6 ? monthsBack : undefined,
          clientBrand: clientBrand.trim() || undefined,
          creators,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create batch');
      }

      const batch = await response.json();
      router.push(`/batches/${batch.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-4xl mx-auto px-8 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-12 text-sm tracking-wide"
        >
          <ArrowLeft className="w-4 h-4" />
          dashboard
        </Link>

        <div className="mb-16">
          <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">
            New Batch
          </h1>
          <p className="text-zinc-600 text-sm">Create a research batch for creator vetting</p>
        </div>

        {/* Batch Details */}
        <div className="pb-10 mb-10 border-b border-zinc-900">
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">Batch Details</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-zinc-400 text-sm mb-2">
                Batch Name
              </label>
              <Input
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g., Q1 2025 Campaign"
                className="bg-transparent border-zinc-800 focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-2">
                Client <span className="text-zinc-600">(optional)</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Nike, Coca-Cola"
                className="bg-transparent border-zinc-800 focus:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Add Creators */}
        <div className="pb-10 mb-10 border-b border-zinc-900">
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">Add Creators</p>
          <BulkImport
            onImport={handleBulkImport}
            existingCount={creators.length}
          />

          {/* Manual Entry Toggle */}
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="flex items-center gap-2 mt-6 text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
          >
            {showManualEntry ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Add single creator manually
          </button>
          {showManualEntry && (
            <div className="mt-6 pt-6 border-t border-zinc-900">
              <CreatorForm onSubmit={handleAddCreator} />
            </div>
          )}
        </div>

        {/* Creator List */}
        {creators.length > 0 && (
          <div className="pb-10 mb-10 border-b border-zinc-900">
            <div className="flex items-center justify-between mb-6">
              <p className="text-zinc-600 text-xs uppercase tracking-wider">
                Creators ({creators.length})
              </p>
              <button
                onClick={() => setCreators([])}
                className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-px max-h-80 overflow-y-auto">
              {creators.map((creator, index) => (
                <div
                  key={index}
                  className="flex items-center py-4 border-b border-zinc-900 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-300 block truncate">
                      {creator.name}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-zinc-600 text-sm">
                      {creator.socialLinks.length} link{creator.socialLinks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveCreator(index)}
                    className="ml-4 text-zinc-600 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Options */}
        <div className={cn('pb-10 mb-10', showAdvanced && 'border-b border-zinc-900')}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-400 text-sm transition-colors"
          >
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced options
          </button>
          {showAdvanced && (
            <div className="mt-8 space-y-8">
              {/* Brand Partnership Analysis */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">
                  Brand Partnership Analysis
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Time Range
                    </label>
                    <select
                      value={monthsBack}
                      onChange={(e) => setMonthsBack(Number(e.target.value))}
                      className="w-full bg-transparent border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:border-zinc-700"
                    >
                      <option value={3}>Last 3 months</option>
                      <option value={6}>Last 6 months (default)</option>
                      <option value={12}>Last 12 months</option>
                      <option value={24}>Last 24 months</option>
                      <option value={36}>Last 36 months (3 years)</option>
                    </select>
                    <p className="mt-2 text-xs text-zinc-600">
                      How far back to analyze creator content
                    </p>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      Client Brand
                    </label>
                    <Input
                      value={clientBrand}
                      onChange={(e) => setClientBrand(e.target.value)}
                      placeholder="e.g., Coca-Cola, Nike"
                      className="bg-transparent border-zinc-800 focus:border-zinc-700"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      AI will identify competitors and flag partnerships
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Search Terms */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-4">
                  Custom Search Terms
                </p>
                <p className="text-zinc-500 text-sm mb-4">
                  Add custom search terms beyond the defaults (lawsuit, scandal, controversy, etc.)
                </p>
                <SearchTermsInput terms={searchTerms} onChange={setSearchTerms} />
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 border border-red-900/50 rounded mb-8">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Batch'}
          </Button>
        </div>
      </div>
    </div>
  );
}
