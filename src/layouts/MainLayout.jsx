import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/cn';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export function MainLayout() {
  const { sidebarCollapsed, toast, dismissToast } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main App Content Area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        )}
      >
        {/* Top Navbar */}
        <Navbar />

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span>Smart Office Management System &copy; 2026. Enterprise SaaS Foundation.</span>
            <span className="flex items-center gap-1.5 text-teal-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              Spring Boot + Vite Architecture
            </span>
          </div>
        </footer>
      </div>

      {/* Floating Interactive Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-slate-900 text-white rounded-xl shadow-xl p-4 flex items-start gap-3 border border-slate-800">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}

            <div className="flex-1 text-xs sm:text-sm text-slate-200 leading-snug">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={dismissToast}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MainLayout;
