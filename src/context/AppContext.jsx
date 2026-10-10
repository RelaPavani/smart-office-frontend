import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Desktop collapse state (full vs icon-only)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Notification toast system
  const [toast, setToast] = useState(null);

  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast((current) => (current && current.message === message ? null : current));
    }, 4000);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = {
    mobileSidebarOpen,
    sidebarCollapsed,
    toggleMobileSidebar,
    closeMobileSidebar,
    toggleSidebarCollapse,
    toast,
    showToast,
    dismissToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
