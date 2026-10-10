import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export function LoadingState({
  message = 'Loading data...',
  className,
  fullHeight = false,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center text-slate-500',
        fullHeight ? 'min-h-[360px]' : 'py-12',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LoadingState;
