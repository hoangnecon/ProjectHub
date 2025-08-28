import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { Bell, BellOff, CheckCircle2, Clock, FileText, Megaphone, Users } from 'lucide-react';
import CircularSpinner from './CircularSpinner';

const NotificationDropdown = ({ isOpen, setIsOpen }) => {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      task_assigned: <FileText size={20} />,
      task_completed: <CheckCircle2 size={20} />,
      deadline_reminder: <Clock size={20} />,
      team_invitation: <Users size={20} />,
      general: <Megaphone size={20} />
    };
    return icons[type] || <Megaphone size={20} />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-glass p-3 rounded-full text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell size={24} />
      </button>

      {/* Red Dot */}
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full pointer-events-none"></span>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 md:top-auto md:mt-0 md:bottom-full md:mb-2 right-[-1rem] sm:right-0 w-[90vw] sm:w-[28rem] max-h-[40rem] overflow-hidden z-50 fade-in glass-intense">
          {/* Header */}
          <div className="p-4 border-b border-white border-opacity-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[38rem] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center">
                <CircularSpinner size="medium" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <BellOff size={48} className="mx-auto text-gray-500 mb-2" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`notification-item p-4 border-b border-white border-opacity-5 cursor-pointer transition-all ${
                    !notification.is_read ? 'notification-unread' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium mb-1 ${
                        !notification.is_read ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-400 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 20 && (
            <div className="p-3 text-center border-t border-white border-opacity-10">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-blue-300 hover:text-blue-200 transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;