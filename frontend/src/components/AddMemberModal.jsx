import React, { useState } from 'react';
import { authAPI, teamAPI } from '../utils/api';
import CircularSpinner from './CircularSpinner';
import { X } from 'lucide-react';

const AddMemberModal = ({ isOpen, onClose, team, onMemberAdded }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await authAPI.searchUsers(query);
      // Filter out users already in the team or selected
      const existingMemberIds = team.members?.map(m => m.id) || [];
      const selectedMemberIds = selectedMembers.map(m => m.id);
      const filteredResults = response.filter(user => 
        !existingMemberIds.includes(user.id) && !selectedMemberIds.includes(user.id)
      );
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectMember = (user) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers(prev => [...prev, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveSelected = (userId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== userId));
  };

  const handleConfirmAdd = async () => {
    setLoading(true);
    try {
      const addPromises = selectedMembers.map(member => 
        teamAPI.addMember(team.id, { userId: member.id })
      );
      await Promise.all(addPromises);
      onMemberAdded();
      onClose();
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-md rounded-2xl slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Member to {team.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl"
          >
            <X size={24} />
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search users by username..."
            className="input-glass w-full focus-glass"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchUsers(e.target.value);
            }}
          />
          
          {searchLoading && <div className="absolute right-3 top-3"><CircularSpinner size="small" /></div>}

          {searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 glass-intense rounded-xl max-h-40 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectMember(user)}
                  className="w-full px-4 py-3 text-left text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white dark:hover:bg-opacity-10 first:rounded-t-xl last:rounded-b-xl transition-colors"
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-gray-400">@{user.username}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMembers.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-400">Selected to add:</p>
            {selectedMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between glass p-3 rounded-xl">
                <span className="text-sm text-gray-800 dark:text-white">{member.full_name} (@{member.username})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSelected(member.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 btn-glass px-4 py-3 rounded-xl text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || selectedMembers.length === 0}
            className="flex-1 btn-glass px-4 py-3 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30 hover:bg-opacity-30 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <CircularSpinner size="small" />
                <span>Adding...</span>
              </>
            ) : (
              <span>Add {selectedMembers.length} Member(s)</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;