import React, { useState, useEffect } from 'react';
import { projectAPI, teamAPI } from '../utils/api';
import { X } from 'lucide-react';
import CircularSpinner from './CircularSpinner';
import { useAuth } from '../hooks/useAuth';

const ProjectModal = ({ isOpen, onClose, onProjectCreated, teamId, isPersonal = false }) => {
  const getInitialState = () => ({
    name: '',
    description: '',
    team_id: teamId || ''
  });

  const [formData, setFormData] = useState(getInitialState());
  const [ownedTeams, setOwnedTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user && !isPersonal && !teamId) {
      const fetchOwnedTeams = async () => {
        try {
          const allTeams = await teamAPI.getAll();
          const userOwnedTeams = allTeams.filter(team => team.owner_id === user.id);
          setOwnedTeams(userOwnedTeams);
          if (userOwnedTeams.length > 0) {
            setFormData(prev => ({ ...prev, team_id: userOwnedTeams[0].id }));
          }
        } catch (err) {
          console.error("Failed to fetch teams", err);
        }
      };
      fetchOwnedTeams();
    }
    // Reset form data when modal is opened or props change
    if (isOpen) {
        setFormData(getInitialState());
    } else {
        setError(''); // Clear error when closing
    }
  }, [isOpen, user, teamId, isPersonal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isPersonal && !formData.team_id) {
      setError('Please select a team for the project.');
      setLoading(false);
      return;
    }

    try {
      const projectData = {
        name: formData.name,
        description: formData.description,
        team_id: isPersonal ? null : formData.team_id
      };
      
      const newProject = await projectAPI.create(projectData);
      onProjectCreated(newProject);
      onClose(); // Close modal on success
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-md rounded-2xl slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isPersonal ? 'Create Personal Project' : 'Create Team Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="alert-glass alert-error p-3 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div>
            <input
              type="text"
              name="name"
              placeholder="Project Name"
              required
              className="input-glass w-full focus-glass"
              value={formData.name}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <textarea
              name="description"
              placeholder="Project Description"
              rows={4}
              required
              className="input-glass w-full focus-glass resize-none"
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          {!isPersonal && !teamId && (
            <div>
              <select
                name="team_id"
                required
                className="input-glass w-full focus-glass"
                value={formData.team_id}
                onChange={handleInputChange}
              >
                {ownedTeams.length === 0 ? (
                  <option value="" disabled>You must own a team to create a project</option>
                ) : (
                  ownedTeams.map(team => (
                    <option key={team.id} value={team.id} className="bg-gray-800">
                      {team.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-xs text-gray-400 mt-1">Projects must be assigned to a team that you own.</p>
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
              disabled={loading}
              className="flex-1 btn-glass px-4 py-3 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30 hover:bg-opacity-30 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <CircularSpinner size="small" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
