import React from 'react';
import { Link } from 'react-router-dom';
import { Users, User, Building, LogOut, Settings, X } from 'lucide-react';

const Sidebar = ({ location, user, onLogout, isSidebarOpen, setIsSidebarOpen }) => {
  const navItems = [
    { id: 'personal', path: '/personal', label: 'Personal Tasks', icon: <User size={20} /> },
    { id: 'teams', path: '/teams', label: 'My Teams', icon: <Building size={20} /> },
  ];

  const checkActive = (path) => {
    const { pathname } = location;
    return pathname.startsWith(path);
  }

  return (
    <div className="sidebar h-full w-64 p-6 slide-in-left">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">ProjectHub</h1>
          <p className="text-secondary text-sm">Welcome, {user?.full_name}</p>
        </div>
        <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 mb-8">
        <div className="text-xs font-semibold text-secondary uppercase tracking-wider mb-4">
          Workspace
        </div>
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            onClick={() => setIsSidebarOpen(false)}
            className={`w-full flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
              checkActive(item.path)
                ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white shadow-2xl ring-1 ring-white/20'
                : 'text-secondary hover:text-primary hover:bg-white/10'
            }`}
          >
            <span className={`transition-transform duration-300 group-hover:scale-110 ${checkActive(item.path) ? 'text-blue-300' : ''}`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute left-6 right-6 space-y-3" style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
        <Link
          to="/settings"
          onClick={() => setIsSidebarOpen(false)}
          className={`w-full flex items-center space-x-4 px-4 py-3 rounded-2xl transition-all duration-300 group ${
            checkActive('/settings')
              ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white shadow-2xl ring-1 ring-white/20'
              : 'text-secondary hover:text-primary hover:bg-white/10'
          }`}
        >
          <span className={`transition-transform duration-300 group-hover:scale-110 ${checkActive('/settings') ? 'text-blue-300' : ''}`}>
            <Settings size={20} />
          </span>
          <span className="font-medium">Settings</span>
        </Link>
        
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 group btn-glass bg-red-500/20 text-red-800 dark:text-red-300 hover:bg-red-500/30 hover:text-red-900 dark:hover:text-red-200 ring-1 ring-red-500/30"
        >
          <span className="transition-transform duration-300 group-hover:scale-110">
            <LogOut size={20} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
