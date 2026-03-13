'use client';

import { cn } from '@/lib/cn';

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
 * Guest info fields — compact layout for form card.
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
}: GuestInfoFormProps) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-medium mb-3" style={{ color: 'var(--t-text-subtle)' }}>
        Данные гостя
      </label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Имя *"
            className={cn('booking-input w-full', formErrors.firstName && 'border-red-500')}
          />
          {formErrors.firstName && <p className="mt-1 text-[11px] text-red-500">{formErrors.firstName}</p>}
        </div>
        <div>
          <input
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Фамилия *"
            className={cn('booking-input w-full', formErrors.lastName && 'border-red-500')}
          />
          {formErrors.lastName && <p className="mt-1 text-[11px] text-red-500">{formErrors.lastName}</p>}
        </div>
      </div>
      <div className="mt-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            let val = e.target.value;
            if (!val.startsWith('+998')) val = '+998' + val.replace(/^\+?998?/, '');
            onPhoneChange(val);
          }}
          placeholder="Телефон / WhatsApp *"
          className={cn('booking-input w-full', formErrors.phone && 'border-red-500')}
        />
        {formErrors.phone && <p className="mt-1 text-[11px] text-red-500">{formErrors.phone}</p>}
      </div>
      <div className="mt-3">
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Email (необязательно)"
          className={cn('booking-input w-full', formErrors.email && 'border-red-500')}
        />
        {formErrors.email && <p className="mt-1 text-[11px] text-red-500">{formErrors.email}</p>}
      </div>
      <div className="mt-3">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Особые пожелания (необязательно)"
          rows={2}
          className="booking-input w-full resize-none"
        />
      </div>
    </div>
  );
}
