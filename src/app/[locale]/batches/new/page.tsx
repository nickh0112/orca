'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
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
  const t = useTranslations('newBatch');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const locale = useLocale();

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
      setError(t('errorBatchName'));
      return;
    }
    if (creators.length === 0) {
      setError(t('errorNoCreators'));
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
          language: locale,
          creators,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create batch');
      }

      const batch = await response.json();
      router.push(`/${locale}/batches/${batch.id}`);
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
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 mb-12 text-sm tracking-wide"
        >
          <ArrowLeft className="w-4 h-4" />
          {tNav('dashboard').toLowerCase()}
        </Link>

        <div className="mb-16">
          <h1 className="text-zinc-200 text-lg font-light tracking-wide mb-1">
            {t('title')}
          </h1>
          <p className="text-zinc-600 text-sm">{t('subtitle')}</p>
        </div>

        {/* Batch Details */}
        <div className="pb-10 mb-10 border-b border-zinc-900">
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">{t('batchDetails')}</p>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-zinc-400 text-sm mb-2">
                {t('batchName')}
              </label>
              <Input
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder={t('batchNamePlaceholder')}
                className="bg-transparent border-zinc-800 focus:border-zinc-700"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-sm mb-2">
                {t('client')} <span className="text-zinc-600">{t('clientOptional')}</span>
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t('clientPlaceholder')}
                className="bg-transparent border-zinc-800 focus:border-zinc-700"
              />
            </div>
          </div>
        </div>

        {/* Add Creators */}
        <div className="pb-10 mb-10 border-b border-zinc-900">
          <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">{t('addCreators')}</p>
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
            {t('addManually')}
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
                {t('creatorsCount', { count: creators.length })}
              </p>
              <button
                onClick={() => setCreators([])}
                className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
              >
                {tCommon('clear')}
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
                      {t('links', { count: creator.socialLinks.length })}
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
            {t('advancedOptions')}
          </button>
          {showAdvanced && (
            <div className="mt-8 space-y-8">
              {/* Brand Partnership Analysis */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-6">
                  {t('brandPartnershipAnalysis')}
                </p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      {t('timeRange')}
                    </label>
                    <select
                      value={monthsBack}
                      onChange={(e) => setMonthsBack(Number(e.target.value))}
                      className="w-full bg-transparent border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-sm focus:outline-none focus:border-zinc-700"
                    >
                      <option value={3}>{t('last3Months')}</option>
                      <option value={6}>{t('last6Months')}</option>
                      <option value={12}>{t('last12Months')}</option>
                      <option value={24}>{t('last24Months')}</option>
                      <option value={36}>{t('last36Months')}</option>
                    </select>
                    <p className="mt-2 text-xs text-zinc-600">
                      {t('timeRangeHelp')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-sm mb-2">
                      {t('clientBrand')}
                    </label>
                    <Input
                      value={clientBrand}
                      onChange={(e) => setClientBrand(e.target.value)}
                      placeholder={t('clientPlaceholder')}
                      className="bg-transparent border-zinc-800 focus:border-zinc-700"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      {t('clientBrandHelp')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Search Terms */}
              <div>
                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-4">
                  {t('customSearchTerms')}
                </p>
                <p className="text-zinc-500 text-sm mb-4">
                  {t('customSearchTermsHelp')}
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
            {tCommon('cancel')}
          </button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? t('creating') : t('createBatch')}
          </Button>
        </div>
      </div>
    </div>
  );
}
