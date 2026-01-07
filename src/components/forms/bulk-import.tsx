'use client';

import { useState, useCallback } from 'react';
import {
  ClipboardPaste,
  Upload,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CreatorInput } from '@/lib/validators';

interface BulkImportProps {
  onImport: (creators: CreatorInput[]) => void;
  existingCount?: number;
}

interface ParsedCreator {
  id: string;
  name: string;
  socialLinks: string[];
  status: 'valid' | 'warning' | 'error';
  message?: string;
}

// Detect if a string looks like a URL or handle
function isSocialLink(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith('http') ||
    v.startsWith('www.') ||
    v.startsWith('@') ||
    v.includes('instagram.com') ||
    v.includes('tiktok.com') ||
    v.includes('twitter.com') ||
    v.includes('x.com') ||
    v.includes('youtube.com')
  );
}

// Convert handle to full URL
function normalizeToUrl(value: string): string {
  const v = value.trim();

  // Already a URL
  if (v.startsWith('http')) return v;
  if (v.startsWith('www.')) return `https://${v}`;

  // Handle with @ - default to Instagram
  if (v.startsWith('@')) {
    return `https://instagram.com/${v.slice(1)}`;
  }

  return v;
}

// Smart parse pasted content
function parseContent(text: string): ParsedCreator[] {
  const lines = text.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return [];

  // Detect delimiter (tab or comma)
  const firstLine = lines[0];
  const isTabDelimited = firstLine.includes('\t');
  const delimiter = isTabDelimited ? '\t' : ',';

  // Parse into rows
  const rows = lines.map((line) => {
    // Handle quoted values
    if (line.includes('"')) {
      const parsed = Papa.parse(line, { delimiter });
      return (parsed.data[0] as string[]) || [];
    }
    return line.split(delimiter).map((v) => v.trim());
  });

  // Check if first row is headers
  const firstRow = rows[0];
  const looksLikeHeader = firstRow.some((cell) => {
    const lower = cell.toLowerCase();
    return (
      lower === 'name' ||
      lower === 'instagram' ||
      lower === 'tiktok' ||
      lower === 'twitter' ||
      lower === 'youtube' ||
      lower === 'social' ||
      lower === 'handle' ||
      lower === 'url' ||
      lower === 'link'
    );
  });

  // Detect column types
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;
  const headerRow = looksLikeHeader ? firstRow : null;

  // Map columns
  let nameColIndex = 0;
  const linkColIndices: number[] = [];

  if (headerRow) {
    headerRow.forEach((header, i) => {
      const h = header.toLowerCase();
      if (h === 'name' || h === 'creator' || h === 'influencer') {
        nameColIndex = i;
      } else if (
        h.includes('instagram') ||
        h.includes('tiktok') ||
        h.includes('twitter') ||
        h.includes('youtube') ||
        h.includes('social') ||
        h.includes('link') ||
        h.includes('url') ||
        h.includes('handle')
      ) {
        linkColIndices.push(i);
      }
    });
    // If no link columns identified, assume all after name are links
    if (linkColIndices.length === 0) {
      for (let i = 0; i < headerRow.length; i++) {
        if (i !== nameColIndex) linkColIndices.push(i);
      }
    }
  } else {
    // Auto-detect: first non-URL column is name, rest are links
    if (dataRows.length > 0) {
      const sampleRow = dataRows[0];
      for (let i = 0; i < sampleRow.length; i++) {
        if (!isSocialLink(sampleRow[i]) && nameColIndex === 0) {
          nameColIndex = i;
        } else {
          linkColIndices.push(i);
        }
      }
      // If all look like links, assume first is name
      if (linkColIndices.length === sampleRow.length) {
        nameColIndex = 0;
        linkColIndices.shift();
      }
    }
  }

  // Parse creators
  const creators: ParsedCreator[] = dataRows.map((row, index) => {
    const name = row[nameColIndex]?.trim() || '';
    const socialLinks = linkColIndices
      .map((i) => row[i]?.trim())
      .filter(Boolean)
      .filter((v) => isSocialLink(v) || v.startsWith('@'))
      .map(normalizeToUrl);

    let status: ParsedCreator['status'] = 'valid';
    let message: string | undefined;

    if (!name) {
      status = 'error';
      message = 'Missing name';
    } else if (socialLinks.length === 0) {
      status = 'warning';
      message = 'No social links';
    }

    return {
      id: `${index}-${Date.now()}`,
      name,
      socialLinks,
      status,
      message,
    };
  });

  return creators.filter((c) => c.name || c.socialLinks.length > 0);
}

export function BulkImport({ onImport, existingCount = 0 }: BulkImportProps) {
  const [creators, setCreators] = useState<ParsedCreator[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (text) {
      const parsed = parseContent(text);
      setCreators(parsed);
    }
  }, []);

  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text) {
      const parsed = parseContent(text);
      setCreators(parsed);
    } else {
      setCreators([]);
    }
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseContent(text);
        setCreators(parsed);
      }
    };
    reader.readAsText(file);
  }, []);

  const removeCreator = (id: string) => {
    setCreators((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCreatorName = (id: string, newName: string) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = { ...c, name: newName };
        if (newName && c.socialLinks.length > 0) {
          updated.status = 'valid';
          updated.message = undefined;
        } else if (!newName) {
          updated.status = 'error';
          updated.message = 'Missing name';
        }
        return updated;
      })
    );
    setEditingId(null);
  };

  const addSocialLink = (id: string, link: string) => {
    const normalized = normalizeToUrl(link);
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updated = {
          ...c,
          socialLinks: [...c.socialLinks, normalized],
        };
        if (c.name && updated.socialLinks.length > 0) {
          updated.status = 'valid';
          updated.message = undefined;
        }
        return updated;
      })
    );
  };

  const removeSocialLink = (creatorId: string, linkIndex: number) => {
    setCreators((prev) =>
      prev.map((c) => {
        if (c.id !== creatorId) return c;
        const updated = {
          ...c,
          socialLinks: c.socialLinks.filter((_, i) => i !== linkIndex),
        };
        if (updated.socialLinks.length === 0) {
          updated.status = 'warning';
          updated.message = 'No social links';
        }
        return updated;
      })
    );
  };

  const handleImport = () => {
    const valid = creators
      .filter((c) => c.name && c.socialLinks.length > 0)
      .map((c) => ({
        name: c.name,
        socialLinks: c.socialLinks,
      }));
    onImport(valid);
    setCreators([]);
  };

  const validCount = creators.filter((c) => c.status === 'valid').length;
  const warningCount = creators.filter((c) => c.status === 'warning').length;
  const errorCount = creators.filter((c) => c.status === 'error').length;

  return (
    <div className="space-y-4">
      {/* Paste/Upload Area */}
      {creators.length === 0 ? (
        <div className="space-y-3">
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
              isPasting ? 'border-zinc-400 bg-zinc-800/50' : 'border-zinc-700'
            )}
            onPaste={handlePaste}
            onFocus={() => setIsPasting(true)}
            onBlur={() => setIsPasting(false)}
          >
            <ClipboardPaste className="w-10 h-10 mx-auto mb-4 text-zinc-500" />
            <p className="text-lg font-medium text-zinc-300 mb-2">
              Paste from spreadsheet
            </p>
            <p className="text-sm text-zinc-500 mb-4">
              Copy rows from Excel, Google Sheets, or any spreadsheet and paste here
            </p>
            <textarea
              className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              onPaste={handlePaste}
              onChange={handleTextAreaChange}
              placeholder="Paste here..."
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <label className="flex items-center justify-center gap-2 p-3 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-600 transition-colors">
            <Upload className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">Upload CSV file</span>
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <p className="text-xs text-zinc-600 text-center">
            Expected columns: Name, Instagram, TikTok, Twitter, YouTube (auto-detected)
          </p>
        </div>
      ) : (
        <>
          {/* Stats Bar */}
          <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-green-400">
                <CheckCircle className="w-4 h-4" />
                {validCount} ready
              </span>
              {warningCount > 0 && (
                <span className="flex items-center gap-1.5 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  {warningCount} warnings
                </span>
              )}
              {errorCount > 0 && (
                <span className="flex items-center gap-1.5 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {errorCount} errors
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreators([])}
              >
                Clear all
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Add {validCount} creators
              </Button>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-zinc-900 sticky top-0">
                  <tr>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3">
                      Social Links
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-400 uppercase px-4 py-3 w-24">
                      Status
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {creators.map((creator) => (
                    <tr
                      key={creator.id}
                      className={cn(
                        'hover:bg-zinc-900/50',
                        creator.status === 'error' && 'bg-red-950/20',
                        creator.status === 'warning' && 'bg-yellow-950/20'
                      )}
                    >
                      <td className="px-4 py-3">
                        {editingId === creator.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateCreatorName(creator.id, editValue);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCreatorName(creator.id, editValue)}
                            >
                              Save
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-zinc-200">
                              {creator.name || '(no name)'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingId(creator.id);
                                setEditValue(creator.name);
                              }}
                              className="text-zinc-600 hover:text-zinc-400"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {creator.socialLinks.map((link, i) => {
                            let displayName = link;
                            try {
                              displayName = new URL(link).hostname.replace('www.', '');
                            } catch {
                              displayName = link.length > 20 ? link.slice(0, 20) + '...' : link;
                            }
                            return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400"
                            >
                              {displayName}
                              <button
                                onClick={() => removeSocialLink(creator.id, i)}
                                className="text-zinc-600 hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                            );
                          })}
                          <button
                            onClick={() => {
                              const link = prompt('Enter social link or @handle:');
                              if (link) addSocialLink(creator.id, link);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-zinc-700 rounded text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-400"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {creator.status === 'valid' && (
                          <span className="text-xs text-green-400">Ready</span>
                        )}
                        {creator.status === 'warning' && (
                          <span className="text-xs text-yellow-400">
                            {creator.message}
                          </span>
                        )}
                        {creator.status === 'error' && (
                          <span className="text-xs text-red-400">
                            {creator.message}
                          </span>
                        )}
                      </td>
                      <td className="px-2">
                        <button
                          onClick={() => removeCreator(creator.id)}
                          className="p-1 text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
