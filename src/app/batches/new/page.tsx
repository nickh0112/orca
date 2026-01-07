'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, User, ChevronDown, ChevronUp } from 'lucide-react';
import { BulkImport } from '@/components/forms/bulk-import';
import { CreatorForm } from '@/components/forms/creator-form';
import { SearchTermsInput } from '@/components/forms/search-terms-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useUserEmail } from '@/hooks/use-user-email';
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>

        <h1 className="text-2xl font-semibold text-zinc-50 mb-8">
          Create Research Batch
        </h1>

        <div className="space-y-6">
          {/* Batch Name & Client */}
          <Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Batch Name
                </label>
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g., Q1 2025 Campaign"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Client <span className="text-zinc-500">(optional)</span>
                </label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Nike, Coca-Cola"
                />
              </div>
            </div>
          </Card>

          {/* Bulk Import - Primary Method */}
          <Card>
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              Add Creators
            </h2>
            <BulkImport
              onImport={handleBulkImport}
              existingCount={creators.length}
            />
          </Card>

          {/* Manual Entry - Secondary */}
          <Card>
            <button
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-zinc-400">
                Add single creator manually
              </span>
              {showManualEntry ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {showManualEntry && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <CreatorForm onSubmit={handleAddCreator} />
              </div>
            )}
          </Card>

          {/* Creator List */}
          {creators.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-zinc-300">
                  Creators to research ({creators.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreators([])}
                  className="text-zinc-500"
                >
                  Clear all
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {creators.map((creator, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <User className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-zinc-200 block truncate">
                          {creator.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {creator.socialLinks.length} link
                          {creator.socialLinks.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCreator(index)}
                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Advanced Options */}
          <Card>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-zinc-400">
                Advanced search options
              </span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-sm text-zinc-500 mb-4">
                  Add custom search terms beyond the defaults (lawsuit, scandal, controversy, etc.)
                </p>
                <SearchTermsInput terms={searchTerms} onChange={setSearchTerms} />
              </div>
            )}
          </Card>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-900 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Batch & Start Research'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
