import React, { useState, useEffect } from 'react';
import { projectAPI, taskAPI, projectMemberAPI } from '../utils/api';
import CircularSpinner from './CircularSpinner';
import { X } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, onTaskSaved, user, project, projectId, taskToEdit }) => {
  const isEditMode = Boolean(taskToEdit);
  
  const getInitialFormData = () => ({
    title: '',
    description: '',
    notes: '',
    priority: 'medium',
    deadline: '',
    project_id: (project && project.id) || projectId || '',
    assignee_ids: []
  });

  const [formData, setFormData] = useState(getInitialFormData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [projectMembers, setProjectMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  useEffect(() => {
    const currentProjectId = (project && project.id) || projectId || (taskToEdit && taskToEdit.project_id);
    if (isOpen && currentProjectId) {
      loadProjectMembers(currentProjectId);
    }
    
    if (isOpen && isEditMode && taskToEdit) {
      setFormData({
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        notes: taskToEdit.notes || '',
        priority: taskToEdit.priority || 'medium',
        deadline: taskToEdit.deadline ? new Date(taskToEdit.deadline).toISOString().split('T')[0] : '',
        project_id: taskToEdit.project_id || '',
        assignee_ids: taskToEdit.assignee_ids || []
      });
    } else {
      setFormData(getInitialFormData());
      setSelectedAssignees([]);
    }
  }, [isOpen, isEditMode, taskToEdit, project, projectId]);

  useEffect(() => {
    // Pre-populate selectedAssignees when in edit mode and members are loaded
    if (isEditMode && projectMembers.length > 0 && taskToEdit) {
      const assignees = projectMembers.filter(member => taskToEdit.assignee_ids.includes(member.user.id));
      setSelectedAssignees(assignees);
    }
  }, [isEditMode, projectMembers, taskToEdit]);

  useEffect(() => {
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      const alreadySelectedIds = new Set(selectedAssignees.map(a => a.user.id));
      const filtered = (Array.isArray(projectMembers) ? projectMembers : []).filter(member =>
        (member.user.full_name.toLowerCase().includes(lowercasedQuery) ||
        member.user.username.toLowerCase().includes(lowercasedQuery)) &&
        !alreadySelectedIds.has(member.user.id)
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers([]);
    }
  }, [searchQuery, projectMembers, selectedAssignees]);

  const loadProjectMembers = async (pId) => {
    try {
      const response = await projectMemberAPI.getForProject(pId);
      setProjectMembers(response.members);
    } catch (error) {
      console.error('Error loading project members:', error);
    }
  };

  const addAssignee = (member) => {
    if (!selectedAssignees.find(a => a.user.id === member.user.id)) {
      setSelectedAssignees(prev => [...prev, member]);
      setFormData(prev => ({
        ...prev,
        assignee_ids: [...prev.assignee_ids, member.user.id]
      }));
    }
    setSearchQuery('');
  };

  const removeAssignee = (userId) => {
    setSelectedAssignees(prev => prev.filter(a => a.user.id !== userId));
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.filter(id => id !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation for team project task creation
    if (!isEditMode && project && project.team_id && formData.assignee_ids.length === 0) {
      setError('Assignees are required for tasks in a team project.');
      setLoading(false);
      return;
    }

    try {
      const taskData = {
        ...formData,
        deadline: formData.deadline ? new Date(`${formData.deadline}T23:59:59.999Z`).toISOString() : null,
        project_id: formData.project_id || null
      };

      if (isEditMode) {
        await taskAPI.update(taskToEdit.id, taskData);
      } else {
        await taskAPI.create(taskData);
      }
      
      onTaskSaved();
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || `Failed to ${isEditMode ? 'update' : 'create'} task`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-lg rounded-2xl slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditMode ? 'Edit Task' : 'Create New Task'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert-glass alert-error p-3 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <input
            type="text"
            name="title"
            placeholder="Task Title"
            required
            className="input-glass w-full focus-glass"
            value={formData.title}
            onChange={handleInputChange}
          />

          <textarea
            name="description"
            placeholder="Task Description"
            rows={3}
            required
            className="input-glass w-full focus-glass resize-none"
            value={formData.description}
            onChange={handleInputChange}
          />

          <textarea
            name="notes"
            placeholder="Additional Notes (Optional)"
            rows={2}
            className="input-glass w-full focus-glass resize-none"
            value={formData.notes}
            onChange={handleInputChange}
          />

          {(project || (taskToEdit && taskToEdit.project_id)) && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Assign to Team Members
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by name or username..."
                  className="input-glass w-full focus-glass"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {filteredMembers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 glass-intense rounded-xl max-h-40 overflow-y-auto">
                    {filteredMembers.map(member => (
                      <button
                        key={member.user.id}
                        type="button"
                        onClick={() => addAssignee(member)}
                        className="w-full px-4 py-3 text-left text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-white dark:hover:bg-opacity-10 first:rounded-t-xl last:rounded-b-xl transition-colors"
                      >
                        <div className="font-medium">{member.user.full_name}</div>
                        <div className="text-sm text-gray-400">@{member.user.username} ({member.role})</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedAssignees.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-400">Selected assignees:</p>
                  {selectedAssignees.map(assignee => (
                    <div key={assignee.user.id} className="flex items-center justify-between glass p-3 rounded-xl">
                      <span className="text-sm text-gray-800 dark:text-white">{assignee.user.full_name} (@{assignee.user.username})</span>
                      <button
                        type="button"
                        onClick={() => removeAssignee(assignee.user.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <select
            name="priority"
            className="input-glass w-full focus-glass"
            value={formData.priority}
            onChange={handleInputChange}
          >
            <option value="low" className="bg-gray-800">Low Priority</option>
            <option value="medium" className="bg-gray-800">Medium Priority</option>
            <option value="high" className="bg-gray-800">High Priority</option>
            <option value="critical" className="bg-gray-800">Critical Priority</option>
          </select>

          <div>
            <input
              type="date"
              name="deadline"
              className="input-glass w-full focus-glass"
              value={formData.deadline}
              onChange={handleInputChange}
            />
            <p className="text-xs text-gray-400 mt-1">Deadline (optional). Time will be set to 23:59.</p>
          </div>

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
              disabled={loading}
              className="flex-1 btn-glass px-4 py-3 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30 hover:bg-opacity-30 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <CircularSpinner size="small" />
                  <span>{isEditMode ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEditMode ? 'Save Changes' : 'Create Task'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;