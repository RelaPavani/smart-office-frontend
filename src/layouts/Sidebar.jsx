import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Users,
  Clock,
  CalendarCheck,
  CheckSquare,
  Calendar,
  Megaphone,
  MessageSquareWarning,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
} from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

const NAVIGATION_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/departments', label: 'Departments', icon: Layers },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/attendance', label: 'Attendance', icon: Clock },
  { to: '/leaves', label: 'Leave Management', icon: CalendarCheck },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/meetings', label: 'Meetings', icon: Calendar },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/reports', label: 'Reports & Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const {
    mobileSidebarOpen,
    closeMobileSidebar,
    sidebarCollapsed,
    toggleSidebarCollapse,
  } = useApp();
  const { user, role } = useAuth();

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-slate-900 text-slate-200 border-r border-slate-800/80 transition-all duration-300 ease-in-out',
          // Desktop sizing
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-64',
          // Mobile visibility
          mobileSidebarOpen
            ? 'translate-x-0 w-64 shadow-2xl'
            : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Branding Header */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-slate-800/80 px-4 transition-all',
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex flex-col text-left">
                <span className="font-bold text-white text-base tracking-tight leading-tight flex items-center gap-1.5">
                  Smart Office
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Pro
                  </span>
                </span>
                <span className="text-xs text-slate-400 font-medium">Enterprise Suite</span>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={closeMobileSidebar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 sidebar-scroll">
          {!sidebarCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Workspaces & Modules
            </div>
          )}

          {NAVIGATION_ITEMS.map((item) => (
            <SidebarItem
              key={item.to}
              to={item.to}
              label={item.label}
              icon={item.icon}
              isCollapsed={sidebarCollapsed}
              onClick={closeMobileSidebar}
            />
          ))}
        </div>

        {/* Footer info & Desktop Collapse Toggle */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-lg bg-slate-800/50 border border-slate-800">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <div className="text-xs text-left overflow-hidden">
                <p className="text-slate-300 font-medium truncate">
                  {user?.username ? user.username : 'Spring Boot 3.3'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user ? `Role: ${role || 'EMPLOYEE'}` : '138 Backend Tests Ready'}
                </p>
              </div>
            </div>
          )}

          {/* Desktop collapse toggle button */}
          <button
            type="button"
            onClick={toggleSidebarCollapse}
            className={cn(
              'hidden lg:flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
              sidebarCollapsed && 'justify-center px-1'
            )}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
