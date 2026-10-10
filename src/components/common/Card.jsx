import React from 'react';
import { cn } from '../../utils/cn';

export function Card({ children, className, hoverable = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all duration-200',
        hoverable && 'hover:shadow-md hover:border-slate-300 transition-shadow',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('p-5 sm:p-6 pb-2', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, as: Component = 'h3', ...props }) {
  return (
    <Component
      className={cn('text-base sm:text-lg font-semibold text-slate-900 tracking-tight', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn('text-xs sm:text-sm text-slate-500 mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'px-5 sm:px-6 py-4 bg-slate-50/60 border-t border-slate-100 rounded-b-xl flex items-center justify-between',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
