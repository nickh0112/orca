'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchTermsInputProps {
  terms: string[];
  onChange: (terms: string[]) => void;
  placeholder?: string;
}

export function SearchTermsInput({
  terms,
  onChange,
  placeholder = 'Add search term...',
}: SearchTermsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTerm = () => {
    const trimmed = inputValue.trim().toLowerCase();
    if (trimmed && !terms.includes(trimmed) && terms.length < 10) {
      onChange([...terms, trimmed]);
      setInputValue('');
    }
  };

  const removeTerm = (index: number) => {
    onChange(terms.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTerm();
    } else if (e.key === 'Backspace' && !inputValue && terms.length > 0) {
      removeTerm(terms.length - 1);
    }
  };

  return (
    <div className="space-y-3">
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {terms.map((term, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 rounded-full text-sm text-zinc-300"
            >
              {term}
              <button
                type="button"
                onClick={() => removeTerm(index)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          disabled={terms.length >= 10}
        />
        <button
          type="button"
          onClick={addTerm}
          disabled={!inputValue.trim() || terms.length >= 10}
          className={cn(
            'h-10 w-10 flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800',
            'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Press Enter to add. {terms.length}/10 custom terms.
      </p>
    </div>
  );
}
