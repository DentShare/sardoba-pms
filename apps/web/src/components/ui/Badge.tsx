'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BookingStatus, BookingSource } from '@sardoba/shared';
import { BOOKING_COLORS, SOURCE_COLORS } from '@/lib/utils/booking-colors';

// ─── Generic Badge ──────────────────────────────────────────────────────────

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gold'
  | 'custom';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  bg?: string;
  text?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-orange-100 text-orange-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  gold: 'bg-sardoba-gold/20 text-sardoba-gold-dark',
  custom: '',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  children,
  variant = 'default',
  bg,
  text,
  className,
  size = 'md',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        sizeStyles[size],
        variant !== 'custom' && variantStyles[variant],
        bg,
        text,
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── StatusBadge ────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Badge for booking statuses with pre-defined colors.
 */
export function StatusBadge({ status, className, size = 'md' }: StatusBadgeProps) {
  const color = BOOKING_COLORS[status];
  if (!color) return null;

  return (
    <Badge variant="custom" bg={color.bg} text={color.text} className={className} size={size}>
      {color.label}
    </Badge>
  );
}

// ─── SourceBadge ────────────────────────────────────────────────────────────

interface SourceBadgeProps {
  source: BookingSource;
  className?: string;
  size?: 'sm' | 'md';
}

/**
 * Badge for booking sources with pre-defined colors.
 */
export function SourceBadge({ source, className, size = 'md' }: SourceBadgeProps) {
  const color = SOURCE_COLORS[source];
  if (!color) return null;

  return (
    <Badge variant="custom" bg={color.bg} text={color.text} className={className} size={size}>
      {color.label}
    </Badge>
  );
}
