import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../utils/api';

const SettingsPage = ({ user }) => {
  const [fullName, setFullName] = useState(user.full_name);
  const [username, setUsername] = useState(user.username);
  const [successMessage, setSuccessMessage] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await authAPI.updateMe({ full_name: fullName, username });
      setSuccessMessage('User information updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 text-text-primary">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8">Settings</h1>
      
      <div className="max-w-lg mx-auto glass p-6 sm:p-8 rounded-lg">
        {successMessage && (
          <div className="bg-green-500 text-white p-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}
        <form onSubmit={handleUpdate}>
          <div className="mb-6">
            <label htmlFor="fullName" className="block mb-2 text-base sm:text-lg">Full Name</label>
            <input 
              type="text" 
              id="fullName" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 input-glass"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="username" className="block mb-2 text-base sm:text-lg">Username</label>
            <input 
              type="text" 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 input-glass"
            />
          </div>
          
          <button type="submit" className="w-full bg-accent-color hover:opacity-90 text-accent-text font-bold py-3 rounded-lg transition duration-300">
            Save Changes
          </button>
        </form>
        
        <div className="mt-8 border-t border-glass-border pt-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg">Dark Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={theme === 'dark'}
                onChange={toggleTheme}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
