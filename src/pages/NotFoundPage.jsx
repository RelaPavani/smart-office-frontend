import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[500px] flex flex-col items-center justify-center text-center p-6 sm:p-12">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-sm border border-rose-100">
        <AlertCircle className="w-8 h-8" />
      </div>

      <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">
        Error 404
      </span>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        The requested path does not exist in the Smart Office navigation hierarchy or has been relocated.
      </p>

      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={Home}>
            Return to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
