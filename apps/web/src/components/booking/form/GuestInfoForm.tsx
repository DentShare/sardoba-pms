'use client';

import { cn } from '@/lib/cn';
import { IconUser, IconPhone, IconMail, IconNotes } from '../icons/booking-icons';

interface GuestInfoFormProps {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  formErrors: Record<string, string>;
  stepNumber: number;
}

/**
 * Step 5: Guest info (first name, last name, phone, email, notes).
 */
export function GuestInfoForm({
  firstName,
  lastName,
  phone,
  email,
  notes,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onEmailChange,
  onNotesChange,
  formErrors,
  stepNumber,
}: GuestInfoFormProps) {
  return (
    <div className="booking-card p-6">
      <h3
        className="flex items-center gap-2 text-lg font-semibold text-t-text mb-4"
        style={{ fontFamily: 'var(--t-font-heading)' }}
      >
        <span className="w-7 h-7 rounded-full bg-t-primary text-white text-sm flex items-center justify-center font-bold">
          {stepNumber}
        </span>
        Данные гостя
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconUser className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Иван"
            className={cn(
              'booking-input w-full',
              formErrors.firstName && 'border-red-500',
            )}
          />
          {formErrors.firstName && <p className="mt-1 text-xs text-red-600">{formErrors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconUser className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Фамилия <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Петров"
            className={cn(
              'booking-input w-full',
              formErrors.lastName && 'border-red-500',
            )}
          />
          {formErrors.lastName && <p className="mt-1 text-xs text-red-600">{formErrors.lastName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconPhone className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Телефон <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              let val = e.target.value;
              if (!val.startsWith('+998')) val = '+998' + val.replace(/^\+?998?/, '');
              onPhoneChange(val);
            }}
            placeholder="+998 90 123 45 67"
            className={cn(
              'booking-input w-full',
              formErrors.phone && 'border-red-500',
            )}
          />
          {formErrors.phone && <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-t-text-muted mb-1">
            <IconMail className="inline w-4 h-4 mr-1 text-t-text-subtle" />
            Email <span className="text-t-text-subtle text-xs font-normal">(необязательно)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="ivan@example.com"
            className={cn(
              'booking-input w-full',
              formErrors.email && 'border-red-500',
            )}
          />
          {formErrors.email && <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-t-text-muted mb-1">
          <IconNotes className="inline w-4 h-4 mr-1 text-t-text-subtle" />
          Примечание <span className="text-t-text-subtle text-xs font-normal">(необязательно)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Особые пожелания, время прибытия и т.д."
          rows={3}
          className="booking-input w-full resize-none"
        />
      </div>
    </div>
  );
}
