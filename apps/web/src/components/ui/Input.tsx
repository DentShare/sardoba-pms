'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  addon?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, addon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {props.required && (
              <span className="text-red-500 ml-0.5">*</span>
            )}
          </label>
        )}

        <div className="relative flex">
          {addon && (
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
              {addon}
            </span>
          )}

          <div className="relative flex-1">
            {leftIcon && (
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                {leftIcon}
              </div>
            )}

            <input
              ref={ref}
              id={inputId}
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm',
                'text-gray-900 placeholder:text-gray-400',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-sardoba-gold/50 focus:border-sardoba-gold',
                'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
                error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                addon && 'rounded-l-none',
                className,
              )}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
              }
              {...props}
            />

            {rightIcon && (
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                {rightIcon}
              </div>
            )}
          </div>
        </div>

        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-gray-500">
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
