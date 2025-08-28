import React from 'react';

const ErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-red-800 bg-opacity-50 p-8 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error</h2>
        <p className="text-red-200 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;
