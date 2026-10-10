import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../utils/cn';

export function SidebarItem({
  to,
  label,
  icon: Icon,
  badge,
  badgeVariant = 'primary',
  isCollapsed = false,
  onClick,
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          isActive
            ? 'bg-blue-600/15 text-white font-semibold shadow-sm border-l-4 border-blue-500 rounded-l-none pl-2.5'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/70',
          isCollapsed && 'justify-center px-2 border-l-0 rounded-lg pl-2'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'w-5 h-5 shrink-0 transition-colors',
              isActive
                ? 'text-blue-400'
                : 'text-slate-400 group-hover:text-slate-200'
            )}
            aria-hidden="true"
          />

          {!isCollapsed && (
            <span className="truncate flex-1 text-left">{label}</span>
          )}

          {!isCollapsed && badge && (
            <span
              className={cn(
                'ml-auto text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                badgeVariant === 'primary'
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              )}
            >
              {badge}
            </span>
          )}

          {/* Tooltip on collapsed desktop view */}
          {isCollapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}

export default SidebarItem;
