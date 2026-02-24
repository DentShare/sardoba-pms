'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { useSearchGuests } from '@/lib/hooks/use-guests';

interface GuestSearchProps {
  value: string;
  onSelect: (id: number, name: string) => void;
  propertyId?: number;
  className?: string;
}

export function GuestSearch({
  value,
  onSelect,
  propertyId,
  className,
}: GuestSearchProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: results, isLoading } = useSearchGuests(debouncedQuery, propertyId);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(v);
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (id: number, firstName: string, lastName: string) => {
      const fullName = `${firstName} ${lastName}`;
      setQuery(fullName);
      setIsOpen(false);
      onSelect(id, fullName);
    },
    [onSelect],
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <Input
        label="Гость"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        placeholder="Поиск по имени или телефону..."
        required
        leftIcon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        }
      />

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Поиск...
            </div>
          ) : results && results.length > 0 ? (
            <>
              {results.map((guest) => (
                <button
                  key={guest.id}
                  onClick={() => handleSelect(guest.id, guest.firstName, guest.lastName)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {guest.firstName} {guest.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{guest.phone}</div>
                  </div>
                  {guest.isVip && (
                    <span className="text-xs bg-sardoba-gold/20 text-sardoba-gold-dark px-2 py-0.5 rounded-full font-medium">
                      VIP
                    </span>
                  )}
                </button>
              ))}
            </>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Гости не найдены
            </div>
          )}
        </div>
      )}
    </div>
  );
}
