import React from 'react';
import { cn } from '../../utils/cn';

const BADGE_VARIANTS = {
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  teal: 'bg-teal-50 text-teal-700 border-teal-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DOT_COLORS = {
  primary: 'bg-blue-500',
  teal: 'bg-teal-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
};

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        BADGE_VARIANTS[variant] || BADGE_VARIANTS.neutral,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
            DOT_COLORS[variant] || DOT_COLORS.neutral
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
