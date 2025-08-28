import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../hooks/useAuth';

const getPageTitle = (pathname) => {
  if (pathname.startsWith('/teams/') && pathname.length > '/teams/'.length) {
    return 'Team Details';
  }
  if (pathname.startsWith('/personal')) {
    return 'Personal Workspace';
  }
   if (pathname.startsWith('/teams')) {
    return 'My Teams';
  }
  switch (pathname) {
    case '/':
      return 'Dashboard';
    case '/settings':
      return 'Settings';
    default:
      return 'ProjectHub';
  }
};

const MainLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [pageTitle, setPageTitle] = useState('ProjectHub');

  useEffect(() => {
    setPageTitle(getPageTitle(location.pathname));
  }, [location.pathname]);

  const handleMenuClick = () => {
    setIsSidebarOpen(true);
    setIsNotificationOpen(false); // Close notification when opening sidebar
  };

  const handleNotificationToggle = (openState) => {
    setIsNotificationOpen(openState);
    if (openState) { // If notifications are opening, close sidebar
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full z-[60] transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar location={location} user={user} onLogout={logout} setIsSidebarOpen={setIsSidebarOpen} />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Overlay for notification dropdown */}
      {isNotificationOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-10 z-40 backdrop-blur-sm"
          onClick={() => setIsNotificationOpen(false)}
        ></div>
      )}

      {/* Desktop Notifications */}
      <div className="hidden md:block fixed bottom-4 right-4 z-50">
        <NotificationDropdown 
          isOpen={isNotificationOpen} 
          setIsOpen={handleNotificationToggle} 
        />
      </div>

      <div className="flex-1 md:ml-64">
        {/* Mobile Header */}
        <MobileHeader 
          onMenuClick={handleMenuClick} 
          pageTitle={pageTitle} 
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={handleNotificationToggle}
        />

        {/* Main Content */}
        <main className="min-h-screen pt-16 md:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;