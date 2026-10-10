import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  User,
  LogOut,
  Shield,
  Briefcase,
  Layers,
  Users,
  Clock,
  CalendarCheck,
  CheckSquare,
  Calendar,
  Megaphone,
  MessageSquareWarning,
  BarChart3,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { Badge } from '../components/common/Badge';

const ROUTE_TITLES = {
  '/': { title: 'Office Overview', icon: LayoutDashboard },
  '/departments': { title: 'Departments Management', icon: Layers },
  '/employees': { title: 'Employee Directory', icon: Users },
  '/attendance': { title: 'Attendance Tracking', icon: Clock },
  '/leaves': { title: 'Leave Management', icon: CalendarCheck },
  '/tasks': { title: 'Task Tracking', icon: CheckSquare },
  '/meetings': { title: 'Meetings & Schedule', icon: Calendar },
  '/announcements': { title: 'Office Announcements', icon: Megaphone },
  '/complaints': { title: 'Complaints & Feedback', icon: MessageSquareWarning },
  '/reports': { title: 'Reports & Analytics', icon: BarChart3 },
};

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleMobileSidebar, showToast } = useApp();
  const { user, logout, role, isAdmin, isManager } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentRoute = ROUTE_TITLES[location.pathname] || {
    title: 'Workspace',
    icon: LayoutDashboard,
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchClick = () => {
    showToast('Global search will be integrated in upcoming prompts.', 'info');
  };

  const handleNotificationClick = () => {
    showToast('Real-time notifications will connect in future prompts.', 'info');
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login', { replace: true });
    showToast('Signed out of Smart Office.', 'info');
  };

  // Generate 2-character user initials
  const userInitials = (user?.username || 'SO')
    .substring(0, 2)
    .toUpperCase();

  // Role badge color mapping
  const roleBadgeVariant = isAdmin ? 'primary' : isManager ? 'teal' : 'neutral';

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 transition-all">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-slate-900">
          <currentRoute.icon className="w-5 h-5 text-blue-600 shrink-0" />
          <h2 className="text-base font-semibold tracking-tight text-slate-800">
            {currentRoute.title}
          </h2>
        </div>
      </div>

      {/* Middle: Search bar placeholder */}
      <div className="flex-1 max-w-md mx-2 sm:mx-4">
        <div
          onClick={handleSearchClick}
          className="relative flex items-center w-full cursor-pointer group"
          role="search"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 group-hover:text-blue-500 transition-colors pointer-events-none" />
          <input
            type="text"
            readOnly
            placeholder="Search records, staff, tasks... (Press Ctrl+K)"
            className="w-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 pl-9 pr-12 py-2 rounded-lg cursor-pointer transition-all duration-150 group-hover:border-slate-300 group-hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <kbd className="hidden md:inline-block absolute right-2.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions, API status, and Authenticated Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend status indicator */}
        <div
          className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-xs text-slate-600 font-medium"
          title="Backend REST API configured at port 8080"
        >
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span>API 8080</span>
        </div>

        {/* Notifications button */}
        <button
          type="button"
          onClick={handleNotificationClick}
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="View notifications"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        {/* Authenticated User Profile & Dropdown */}
        <div className="relative pl-2 border-l border-slate-200" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* User Initials Avatar */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
              {userInitials}
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {user?.username || 'Authenticated Staff'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {role || 'EMPLOYEE'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.username || 'Current User'}
                </p>
                {user?.email ? (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                ) : (
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">Corporate Account</p>
                )}
                <div className="mt-2 flex items-center gap-1.5">
                  <Badge variant={roleBadgeVariant} size="sm" dot>
                    {role}
                  </Badge>
                  {isAdmin && (
                    <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3" /> System Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="px-2 py-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of System</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
