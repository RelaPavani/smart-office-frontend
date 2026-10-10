import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm border border-transparent focus-visible:ring-blue-500',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300 border border-slate-200/80 focus-visible:ring-slate-400',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 active:bg-slate-100 shadow-sm focus-visible:ring-blue-500',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400',
  teal: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-sm border border-transparent focus-visible:ring-teal-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm border border-transparent focus-visible:ring-rose-500',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base font-medium rounded-lg gap-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
      ) : LeftIcon ? (
        <LeftIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}

      <span>{children}</span>

      {!isLoading && RightIcon ? (
        <RightIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : null}
    </button>
  );
}

export default Button;
