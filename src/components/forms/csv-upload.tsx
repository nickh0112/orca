'use client';

import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreatorInput } from '@/lib/validators';

interface CSVUploadProps {
  onParsed: (creators: CreatorInput[]) => void;
}

interface CSVRow {
  name?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

export function CSVUpload({ onParsed }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsedCount, setParsedCount] = useState(0);

  const parseCSV = useCallback(
    (file: File) => {
      Papa.parse<CSVRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const creators: CreatorInput[] = [];
          const parseErrors: string[] = [];

          results.data.forEach((row, index) => {
            if (!row.name?.trim()) {
              parseErrors.push(`Row ${index + 2}: Missing name`);
              return;
            }

            const socialLinks = [
              row.instagram,
              row.twitter,
              row.youtube,
              row.tiktok,
            ].filter((link): link is string => Boolean(link?.trim()));

            if (socialLinks.length === 0) {
              parseErrors.push(`Row ${index + 2}: No social links provided`);
              return;
            }

            creators.push({
              name: row.name.trim(),
              socialLinks,
            });
          });

          setErrors(parseErrors);
          setParsedCount(creators.length);
          if (creators.length > 0) {
            onParsed(creators);
          }
        },
        error: (error) => {
          setErrors([error.message]);
        },
      });
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile?.type === 'text/csv' ||
        droppedFile?.name.endsWith('.csv')
      ) {
        setFile(droppedFile);
        setErrors([]);
        setParsedCount(0);
        parseCSV(droppedFile);
      } else {
        setErrors(['Please upload a CSV file']);
      }
    },
    [parseCSV]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setErrors([]);
        setParsedCount(0);
        parseCSV(selectedFile);
      }
    },
    [parseCSV]
  );

  const clearFile = () => {
    setFile(null);
    setErrors([]);
    setParsedCount(0);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-zinc-400 bg-zinc-800/50'
            : 'border-zinc-700 hover:border-zinc-600'
        )}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-3 text-zinc-500" />
        <p className="text-sm text-zinc-400 mb-1">
          Drag and drop a CSV file, or click to browse
        </p>
        <p className="text-xs text-zinc-500">
          Columns: name, instagram, twitter, youtube, tiktok
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-input"
        />
      </div>

      {file && (
        <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-300 flex-1 truncate">
            {file.name}
          </span>
          {parsedCount > 0 && (
            <span className="flex items-center gap-1 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              {parsedCount} creators
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearFile();
            }}
            className="text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="p-3 bg-red-950/30 border border-red-900 rounded-lg">
          {errors.slice(0, 5).map((error, i) => (
            <p key={i} className="text-sm text-red-400">
              {error}
            </p>
          ))}
          {errors.length > 5 && (
            <p className="text-sm text-red-400 mt-1">
              ...and {errors.length - 5} more errors
            </p>
          )}
        </div>
      )}
    </div>
  );
}
