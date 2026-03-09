'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useSearchGuests } from '@/lib/hooks/use-guests';

export interface NewGuestData {
  first_name: string;
  last_name: string;
  phone: string;
}

interface GuestSearchProps {
  value: string;
  onSelect: (id: number, name: string) => void;
  onNewGuest?: (guest: NewGuestData) => void;
  propertyId?: number;
  className?: string;
}

export function GuestSearch({
  value,
  onSelect,
  onNewGuest,
  propertyId,
  className,
}: GuestSearchProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: results, isLoading } = useSearchGuests(debouncedQuery, propertyId ?? 0);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setIsOpen(true);
    setShowNewForm(false);

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
      setShowNewForm(false);
      onSelect(id, fullName);
    },
    [onSelect],
  );

  const handleShowNewForm = useCallback(() => {
    setIsOpen(false);
    setShowNewForm(true);

    // Pre-fill name from search query
    const parts = query.trim().split(/\s+/);
    if (parts.length >= 2) {
      setNewFirstName(parts[0]);
      setNewLastName(parts.slice(1).join(' '));
    } else if (parts.length === 1 && parts[0]) {
      setNewFirstName(parts[0]);
      setNewLastName('');
    }
  }, [query]);

  const handleCreateGuest = useCallback(() => {
    if (!newFirstName.trim() || !newLastName.trim() || !newPhone.trim()) return;

    const fullName = `${newFirstName.trim()} ${newLastName.trim()}`;
    setQuery(fullName);
    setShowNewForm(false);

    onNewGuest?.({
      first_name: newFirstName.trim(),
      last_name: newLastName.trim(),
      phone: newPhone.trim(),
    });
  }, [newFirstName, newLastName, newPhone, onNewGuest]);

  const handleCancelNew = useCallback(() => {
    setShowNewForm(false);
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
  }, []);

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
      {!showNewForm ? (
        <>
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
                  {onNewGuest && (
                    <button
                      onClick={handleShowNewForm}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-2 border-t border-gray-100 transition-colors text-sardoba-blue"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                      <span className="text-sm font-medium">Создать нового гостя</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="p-3">
                  <div className="text-sm text-gray-500 text-center mb-2">
                    Гости не найдены
                  </div>
                  {onNewGuest && (
                    <button
                      onClick={handleShowNewForm}
                      className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-center gap-2 rounded-md border border-dashed border-sardoba-blue/40 transition-colors text-sardoba-blue"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                      </svg>
                      <span className="text-sm font-medium">Создать нового гостя</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="border border-sardoba-blue/20 rounded-lg p-4 bg-blue-50/30 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-sardoba-blue">Новый гость</span>
            <button
              onClick={handleCancelNew}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Отмена
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Имя"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Имя"
              required
              autoFocus
            />
            <Input
              label="Фамилия"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Фамилия"
              required
            />
          </div>
          <Input
            label="Телефон"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+998901234567"
            required
          />
          <Button
            size="sm"
            onClick={handleCreateGuest}
            disabled={!newFirstName.trim() || !newLastName.trim() || !newPhone.trim()}
            className="w-full"
          >
            Подтвердить гостя
          </Button>
        </div>
      )}
    </div>
  );
}
