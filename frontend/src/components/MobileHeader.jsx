import React from 'react';
import { Menu } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const MobileHeader = ({ onMenuClick, pageTitle, isNotificationOpen, setIsNotificationOpen }) => {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 z-50 flex items-center justify-between px-4 glass-intense">
      <button onClick={onMenuClick} className="p-2 text-gray-800 dark:text-white">
        <Menu size={24} />
      </button>
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h1>
      <div>
        <NotificationDropdown isOpen={isNotificationOpen} setIsOpen={setIsNotificationOpen} />
      </div>
    </header>
  );
};

export default MobileHeader;