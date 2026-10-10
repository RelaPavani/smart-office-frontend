import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const InputField = forwardRef(function InputField(
  {
    id,
    label,
    type = 'text',
    error,
    helperText,
    required = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    className,
    containerClassName,
    disabled = false,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={cn('w-full text-left', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
        >
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {LeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <LeftIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          className={cn(
            'block w-full rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            LeftIcon ? 'pl-9' : 'pl-3.5',
            RightIcon ? 'pr-9' : 'pr-3.5',
            'py-2.5',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100',
            disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200',
            className
          )}
          {...props}
        />

        {RightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <RightIcon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

export default InputField;
