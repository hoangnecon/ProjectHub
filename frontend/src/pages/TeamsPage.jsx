import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamAPI, authAPI, projectAPI } from '../utils/api';

import CircularSpinner from '../components/CircularSpinner';
import { X, Plus, Users, Building, Calendar, ArrowLeft, Trash2, UserPlus, ShieldCheck, Target } from 'lucide-react';
import AddMemberModal from '../components/AddMemberModal';
import ConfirmModal from '../components/ConfirmModal';

import { useErrorContext } from '../context/ErrorContext';
import { useTeams } from '../context/TeamsContext';

import { useProjects } from '../context/ProjectsContext';
import ProjectModal from '../components/ProjectModal';
import ProjectCard from '../components/ProjectCard';

const TeamDetails = ({ team, user, onBack }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const { showError } = useErrorContext();
  const { updateTeam, deleteTeam: deleteTeamContext } = useTeams();
  const { addProject, deleteProject } = useProjects();
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(null);
  const [activeTab, setActiveTab] = useState('projects');

  const isOwner = team.owner_id === user.id;

  useEffect(() => {
    fetchProjects();
  }, [team.id]);

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const projectData = await teamAPI.getProjectsForTeam(team.id);
      setProjects(projectData || []);
    } catch (error) {
      showError('Could not fetch team projects.');
      console.error("Error fetching team projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleAddMember = async (newMember) => {
    try {
      const updatedTeam = await teamAPI.addMember(team.id, { userId: newMember.id });
      updateTeam(updatedTeam);
    } catch (error) {
      showError(error.message || 'Error adding member.');
      console.error('Error adding member:', error);
    } finally {
      setShowAddMemberModal(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    addProject(newProject);
    setShowProjectModal(false);
    fetchProjects();
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await projectAPI.delete(projectId);
      deleteProject(projectId);
      fetchProjects();
    } catch (error) {
      showError(error.message || 'Failed to delete project.');
      console.error("Error deleting project:", error);
    } finally {
      setShowDeleteProjectConfirm(null);
    }
  };

  const handleRemoveMember = async (memberIdToRemove) => {
    try {
      const updatedTeam = await teamAPI.removeMember(team.id, memberIdToRemove);
      updateTeam(updatedTeam);
    } catch (error) {
      showError(error.message || 'Failed to remove member.');
      console.error("Error removing member:", error);
    } finally {
      setShowRemoveConfirm(null);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      await teamAPI.delete(team.id);
      deleteTeamContext(team.id);
      onBack();
    } catch (error) {
      showError(error.message || 'Failed to delete team.');
      console.error("Error deleting team:", error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleProjectClick = (project) => {
    navigate(`/teams/${team.id}/projects/${project.id}`);
  };

  const displayRole = (member) => {
    if (member.id === team.owner_id) return 'Owner';
    if (member.role === 'admin') return 'Admin';
    return 'Member';
  }

  const ProjectsComponent = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">Projects ({projects.length})</h2>
        {isOwner && (
          <button 
            onClick={() => setShowProjectModal(true)}
            className="hidden md:flex btn-glass px-4 py-2 rounded-xl bg-green-500 bg-opacity-20 text-green-800 dark:text-green-300 border border-green-500/30 hover:bg-opacity-30 items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Project</span>
          </button>
        )}
      </div>
      {loadingProjects ? (
        <div className="flex justify-center py-12"><CircularSpinner size="large" /></div>
      ) : (
        <div className="card-grid-2">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              type="team-project"
              isOwner={isOwner}
              onCardClick={handleProjectClick}
              onDeleteClick={setShowDeleteProjectConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );

  const MembersComponent = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-primary">Members ({team.members.length})</h2>
        {isOwner && (
          <button 
            onClick={() => setShowAddMemberModal(true)}
            className="hidden md:flex btn-glass px-4 py-2 rounded-xl bg-blue-500 bg-opacity-20 text-accent border-accent/30 hover:bg-opacity-30 items-center space-x-2"
          >
            <UserPlus size={16} />
            <span>Add Member</span>
          </button>
        )}
      </div>
      {team.members.map(member => (
        <div key={member.id} className="glass p-4 rounded-xl flex justify-between items-center">
          <div>
            <p className="font-semibold text-primary">{member.full_name}</p>
            <p className="text-sm text-secondary">@{member.username} - <span className="font-medium text-purple-500 dark:text-purple-300">{displayRole(member)}</span></p>
          </div>
          {isOwner && user.id !== member.id && (
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowRemoveConfirm(member.id)}
                className="btn-glass px-3 py-1 text-xs text-red-800 dark:text-red-300 hover:text-red-200 flex items-center space-x-1"
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fade-in">
      <button
        onClick={onBack}
        className="btn-glass px-4 py-2 rounded-xl text-accent hover:opacity-80 mb-4 flex items-center space-x-2"
      >
        <ArrowLeft size={20} />
        <span>Back to Teams</span>
      </button>

      <div className="glass-intense p-6 rounded-2xl mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">{team.name}</h1>
            <p className="text-secondary max-w-2xl">{team.description}</p>
          </div>
          {isOwner && (
            <div className="flex space-x-2 self-start">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-glass px-4 py-2 rounded-xl bg-red-600/20 text-red-800 dark:text-red-300 border border-red-500/30 hover:bg-opacity-30 flex items-center space-x-2"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Delete Team</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden flex gap-2 mb-4 border-b border-gray-200 dark:border-white/10">
        <button 
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-3 text-sm font-medium w-full ${activeTab === 'projects' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}>
            Projects
        </button>
        <button 
          onClick={() => setActiveTab('members')}
          className={`px-4 py-3 text-sm font-medium w-full ${activeTab === 'members' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}>
            Members
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Desktop Layout */}
        <div className="hidden md:block md:col-span-2">
          <ProjectsComponent />
        </div>
        <div className="hidden md:block">
          <MembersComponent />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {activeTab === 'projects' && <ProjectsComponent />}
          {activeTab === 'members' && <MembersComponent />}
        </div>
      </div>

      {showAddMemberModal && (
        <AddMemberModal 
          isOpen={showAddMemberModal} 
          onClose={() => setShowAddMemberModal(false)} 
          team={team} 
          onMemberAdded={handleAddMember} 
        />
      )}

      <ProjectModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        onProjectCreated={handleProjectCreated}
        teamId={team.id}
      />

      <ConfirmModal 
        isOpen={showDeleteConfirm}
        message="Are you sure you want to delete this team? This action cannot be undone."
        onConfirm={handleDeleteTeam}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal 
        isOpen={!!showRemoveConfirm}
        message="Are you sure you want to remove this member from the team?"
        onConfirm={() => handleRemoveMember(showRemoveConfirm)}
        onCancel={() => setShowRemoveConfirm(null)}
      />

      <ConfirmModal 
        isOpen={!!showDeleteProjectConfirm}
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={() => handleDeleteProject(showDeleteProjectConfirm)}
        onCancel={() => setShowDeleteProjectConfirm(null)}
      />

      {/* FAB for Mobile */}
      {isOwner && (
        <button
          onClick={() => activeTab === 'projects' ? setShowProjectModal(true) : setShowAddMemberModal(true)}
          className="md:hidden fixed bottom-24 right-6 z-20 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
        >
          {activeTab === 'projects' ? <Plus size={24} /> : <UserPlus size={24} />}
        </button>
      )}
    </div>
  )
}

const TeamModal = ({ isOpen, onClose, onTeamCreated }) => {
  const [formData, setFormData] = useState({ name: '', description: '', members: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
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
      setSearchResults(response);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const addMember = (user) => {
    if (!formData.members.find(m => m.id === user.id)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, user]
      }));
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== userId)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const teamData = {
        name: formData.name,
        description: formData.description,
        members: formData.members.map(m => m.id)
      };
      
      const newTeam = await teamAPI.create(teamData);
      onTeamCreated(newTeam); // Pass the new team to the parent
      setFormData({ name: '', description: '', members: [] });
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-md rounded-2xl slide-in-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Create Team</h2>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-xl"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Team Name"
              required
              className="input-glass w-full focus-glass"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <textarea
              placeholder="Team Description"
              rows={3}
              className="input-glass w-full focus-glass resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-secondary mb-2 block">
              Add Team Members
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="input-glass w-full focus-glass"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
              />
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 glass-intense rounded-xl max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addMember(user)}
                      className="w-full px-4 py-3 text-left hover:bg-black hover:bg-opacity-10 dark:hover:bg-white dark:hover:bg-opacity-10 text-primary first:rounded-t-xl last:rounded-b-xl transition-colors"
                    >
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-secondary">@{user.username}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {formData.members.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-secondary">Selected members:</p>
                {formData.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between glass p-3 rounded-xl">
                    <span className="text-sm text-primary">{member.full_name}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-sm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-glass px-4 py-3 rounded-xl text-secondary hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-glass px-4 py-3 rounded-xl bg-accent text-accent-text hover:opacity-90 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <CircularSpinner size="small" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Team</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamsPage = ({ user }) => {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const { teams, loading, addTeam } = useTeams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (teamId) {
      const team = teams.find(t => t.id === teamId);
      setSelectedTeam(team);
    } else {
      setSelectedTeam(null);
    }
  }, [teamId, teams]);

  const handleTeamCreated = (newTeam) => {
    addTeam(newTeam);
    setShowCreateModal(false);
  };

  const handleTeamClick = (team) => {
    navigate(`/teams/${team.id}`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">My Teams</h1>
          <p className="text-secondary">Manage and collaborate with your teams</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="hidden md:flex btn-glass px-6 py-3 rounded-xl bg-accent text-accent-text hover:opacity-90 items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create Team</span>
        </button>
      </div>

      {selectedTeam ? (
        <TeamDetails 
          team={selectedTeam} 
          user={user} 
          onBack={() => navigate('/teams')} 
        />
      ) : (
        <>
          {/* Teams Grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <CircularSpinner size="large" />
            </div>
          ) : teams.length === 0 ? (
            <div className="glass-intense p-12 rounded-2xl text-center">
              <Users size={64} className="text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold text-primary mb-2">No teams yet</h3>
              <p className="text-secondary mb-6">Create your first team to start collaborating</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-glass px-6 py-3 rounded-xl bg-accent text-accent-text hover:opacity-90"
              >
                Create Your First Team
              </button>
            </div>
          ) : (
            <div className="card-grid-3">
              {teams.map((team, index) => (
                <ProjectCard
                  key={team.id}
                  project={team}
                  index={index}
                  type="team"
                  user={user}
                  onCardClick={handleTeamClick}
                />
              ))}
            </div>
          )}
        </>
      )}

      <TeamModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTeamCreated={handleTeamCreated}
      />

      {/* FAB for Mobile */}
      {!selectedTeam && (
        <button
          onClick={() => setShowCreateModal(true)}
          className="md:hidden fixed bottom-24 right-6 z-20 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};



export default TeamsPage;