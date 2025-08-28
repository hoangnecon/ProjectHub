import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Edit, Trash2, Send } from 'lucide-react';

const SubmissionModal = ({ isOpen, onClose, onSubmit, existingSubmissions = [], user }) => {
  const [currentContent, setCurrentContent] = useState('');
  const [editingEntryId, setEditingEntryId] = useState(null);
  const submissions = Array.isArray(existingSubmissions) ? existingSubmissions : [];

  useEffect(() => {
    // If user has an existing submission, pre-fill the textarea
    const userEntry = submissions.find(entry => entry.user_id === user.id);
    if (userEntry) {
      setCurrentContent(userEntry.content);
      setEditingEntryId(userEntry.user_id);
    } else {
      setCurrentContent('');
      setEditingEntryId(null);
    }
  }, [submissions, user.id]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (currentContent.trim()) {
      onSubmit(currentContent.trim());
      onClose();
    }
  };

  const handleEdit = (entry) => {
    setCurrentContent(entry.content);
    setEditingEntryId(entry.user_id);
  };

  const handleDelete = (entryToDelete) => {
    if (window.confirm(`Are you sure you want to delete your submission?`)) {
      // Pass an empty string to onSubmit to indicate deletion of current user's entry
      onSubmit(''); 
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-2xl rounded-2xl slide-in-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Submit Task Content</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl"
          >
            <X size={24} />
          </button>
        </div>

        {existingSubmissions.length > 0 && (
          <div className="mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">Current Submissions:</h3>
            {existingSubmissions.map((entry, index) => (
              <div key={index} className="glass-card p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-blue-400">{entry.username}</span>
                  <span className="text-xs text-gray-500">{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                </div>
                <p className="text-gray-200 whitespace-pre-wrap mb-2">{entry.content}</p>
                {entry.user_id === user.id && (
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(entry)}
                      className="text-yellow-400 hover:text-yellow-300 flex items-center space-x-1 text-sm"
                    >
                      <Edit size={16} /> <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(entry)}
                      className="text-red-400 hover:text-red-300 flex items-center space-x-1 text-sm"
                    >
                      <Trash2 size={16} /> <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">{editingEntryId ? 'Edit Your Submission:' : 'Add Your Submission:'}</h3>
          <textarea
            className="w-full p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="6"
            placeholder="Enter your submission content (e.g., link, notes)..."
            value={currentContent}
            onChange={(e) => setCurrentContent(e.target.value)}
            required
          ></textarea>
          <div className="flex justify-end space-x-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-glass px-4 py-2 rounded-xl bg-gray-600 bg-opacity-20 text-gray-300 border border-gray-500 border-opacity-30 hover:bg-opacity-30"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-glass px-4 py-2 rounded-xl bg-green-600 bg-opacity-20 text-green-300 border border-green-500 border-opacity-30 hover:bg-opacity-30 flex items-center space-x-2"
            >
              <Send size={16} /> <span>{editingEntryId ? 'Update Content' : 'Save Content'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmissionModal;
