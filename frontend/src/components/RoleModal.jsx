import React, { useState, useEffect } from 'react';
import { projectMemberAPI } from '../utils/api';

const RoleModal = ({ isOpen, onClose, onRoleUpdated, project, member }) => {
  const [role, setRole] = useState('');

  useEffect(() => {
    if (member) {
      setRole(member.role);
    }
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await projectMemberAPI.updateRole(project.id, member.user_id, role);
      onRoleUpdated();
    } catch (error) {
      console.error("Error updating role", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-md rounded-2xl slide-in-up">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Role for {member.user.full_name}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
            <input
              type="text"
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="input-glass w-full focus-glass mt-1"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="btn-glass px-4 py-2 rounded-xl">Cancel</button>
            <button type="submit" className="btn-glass px-4 py-2 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500">Update Role</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;