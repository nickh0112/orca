'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface FilterCategory {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

export interface ActiveFilter {
  categoryId: string;
  optionId: string;
}

interface FilterChipsProps {
  categories: FilterCategory[];
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  className?: string;
}

interface FilterDropdownProps {
  category: FilterCategory;
  activeFilters: ActiveFilter[];
  onSelect: (optionId: string) => void;
  onClose: () => void;
}

function FilterDropdown({ category, activeFilters, onSelect, onClose }: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const selectedOptions = activeFilters
    .filter((f) => f.categoryId === category.id)
    .map((f) => f.optionId);

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 mt-2 min-w-[180px] py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50"
    >
      <div className="px-3 py-1.5 border-b border-zinc-800 mb-1">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          {category.label}
        </span>
      </div>
      {category.options.map((option) => {
        const isSelected = selectedOptions.includes(option.id);
        return (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors',
              isSelected
                ? 'text-zinc-100 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
            )}
          >
            {option.icon && <span className="shrink-0">{option.icon}</span>}
            <span className="flex-1 text-left">{option.label}</span>
            {isSelected && <Check size={14} className="text-emerald-500 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

export function FilterChips({
  categories,
  activeFilters,
  onFiltersChange,
  className,
}: FilterChipsProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleSelectOption = (categoryId: string, optionId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    const existingFilter = activeFilters.find(
      (f) => f.categoryId === categoryId && f.optionId === optionId
    );

    if (existingFilter) {
      // Remove filter
      onFiltersChange(activeFilters.filter((f) => f !== existingFilter));
    } else if (category?.multiSelect) {
      // Add to multi-select
      onFiltersChange([...activeFilters, { categoryId, optionId }]);
    } else {
      // Replace single-select
      onFiltersChange([
        ...activeFilters.filter((f) => f.categoryId !== categoryId),
        { categoryId, optionId },
      ]);
    }

    if (!category?.multiSelect) {
      setOpenDropdown(null);
    }
  };

  const handleRemoveFilter = (filter: ActiveFilter) => {
    onFiltersChange(activeFilters.filter((f) => f !== filter));
  };

  const getFilterLabel = (filter: ActiveFilter): string => {
    const category = categories.find((c) => c.id === filter.categoryId);
    const option = category?.options.find((o) => o.id === filter.optionId);
    return option?.label || filter.optionId;
  };

  const getFilterIcon = (filter: ActiveFilter): React.ReactNode | null => {
    const category = categories.find((c) => c.id === filter.categoryId);
    const option = category?.options.find((o) => o.id === filter.optionId);
    return option?.icon || null;
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Active filter chips */}
      {activeFilters.map((filter, index) => (
        <div
          key={`${filter.categoryId}-${filter.optionId}-${index}`}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 group"
        >
          {getFilterIcon(filter) && (
            <span className="shrink-0">{getFilterIcon(filter)}</span>
          )}
          <span>{getFilterLabel(filter)}</span>
          <button
            onClick={() => handleRemoveFilter(filter)}
            className="ml-0.5 p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {/* Add filter dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(openDropdown ? null : 'main')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            'border border-dashed border-zinc-700 text-zinc-500',
            'hover:border-zinc-600 hover:text-zinc-400',
            openDropdown === 'main' && 'border-zinc-600 text-zinc-400'
          )}
        >
          <Plus size={14} />
          <span>Add filter</span>
          <ChevronDown size={12} className={cn(
            'transition-transform',
            openDropdown === 'main' && 'rotate-180'
          )} />
        </button>

        {openDropdown === 'main' && (
          <div className="absolute top-full left-0 mt-2 min-w-[160px] py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setOpenDropdown(category.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
              >
                <span>{category.label}</span>
                <ChevronDown size={12} className="-rotate-90" />
              </button>
            ))}
          </div>
        )}

        {categories.map((category) =>
          openDropdown === category.id ? (
            <FilterDropdown
              key={category.id}
              category={category}
              activeFilters={activeFilters}
              onSelect={(optionId) => handleSelectOption(category.id, optionId)}
              onClose={() => setOpenDropdown(null)}
            />
          ) : null
        )}
      </div>
    </div>
  );
}
