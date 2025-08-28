import React from 'react';

const ConfirmModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-sm rounded-2xl slide-in-up">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirmation</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="btn-glass px-4 py-2 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-glass px-4 py-2 rounded-xl bg-red-600 bg-opacity-20 text-red-300 border border-red-500 border-opacity-30 hover:bg-opacity-30"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;