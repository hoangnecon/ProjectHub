import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectAPI, teamAPI, taskAPI } from '../utils/api';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import CircularSpinner from '../components/CircularSpinner';
import TaskDetailModal from '../components/TaskDetailModal';
import { ArrowLeft, Plus, Users, Calendar, ClipboardList, RefreshCw, CheckCircle2, Clipboard, Target, Hand } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import ProjectModal from '../components/ProjectModal';
import ProjectRoleManager from '../components/ProjectRoleManager';
import AddMemberModal from '../components/AddMemberModal';
import { useProjects } from '../context/ProjectsContext';
import { useTeams } from '../context/TeamsContext';

const ProjectView = ({ project, user, onBack }) => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [totalTeamMembersCount, setTotalTeamMembersCount] = useState(0);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  
  const { 
    tasks, 
    loading: tasksLoading, 
    filter, 
    setFilter, 
    createTask,
    updateTask, 
    deleteTask, 
    refresh: refreshTasks,
    hasMore,
    loadMore
  } = useTasks(project?.id);

  const handleTaskClick = useCallback((task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  }, [setSelectedTask, setShowDetailModal]);

  const [pendingTasks, setPendingTasks] = useState([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [hasMorePending, setHasMorePending] = useState(true);
  const [loadingPending, setLoadingPending] = useState(false);
  const [totalPendingCount, setTotalPendingCount] = useState(0);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks');

  const taskObserver = useRef();
  const lastTaskElementRef = useCallback(node => {
    if (tasksLoading) return;
    if (taskObserver.current) taskObserver.current.disconnect();
    taskObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) taskObserver.current.observe(node);
  }, [tasksLoading, hasMore, loadMore]);

  const pendingObserver = useRef();
  const lastPendingTaskElementRef = useCallback(node => {
    if (loadingPending) return;
    if (pendingObserver.current) pendingObserver.current.disconnect();
    pendingObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMorePending) {
        loadMorePending();
      }
    });
    if (node) pendingObserver.current.observe(node);
  }, [loadingPending, hasMorePending]);

  const loadPendingTasks = async (currentPage, isRefresh = false) => {
    if (!project || loadingPending || (!isRefresh && !hasMorePending)) return;

    setLoadingPending(true);
    try {
      const perPage = 20;
      const response = await taskAPI.getPendingApproval(project.id, currentPage, perPage);
      
      const newPendingTasks = response.tasks || [];
      const totalCount = response.total_count || 0;

      setPendingTasks(prevTasks => isRefresh ? newPendingTasks : [...prevTasks, ...newPendingTasks]);
      setHasMorePending( (isRefresh ? newPendingTasks.length : pendingTasks.length + newPendingTasks.length) < totalCount );
      setPendingPage(currentPage + 1);
      setTotalPendingCount(totalCount);

    } catch (error) {
      console.error('Error loading pending tasks:', error);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadMorePending = () => {
    if (!loadingPending && hasMorePending) {
      loadPendingTasks(pendingPage);
    }
  };

  const refreshPendingTasks = () => {
    setPendingTasks([]);
    setPendingPage(1);
    setHasMorePending(true);
    setTotalPendingCount(0);
    loadPendingTasks(1, true);
  };

  useEffect(() => {
    const fetchTeamMembers = async (currentPage = 1, isRefresh = false) => {
      if (!project) return;
      try {
        const perPage = 50;
        const response = await teamAPI.getMembers(project.team_id, currentPage, perPage);
        setTeamMembers(response.users || []);
        setTotalTeamMembersCount(response.total_count || 0);
      } catch (error) {
        console.error("Error fetching team members:", error);
        setTeamMembers([]);
        setTotalTeamMembersCount(0);
      }
    };
    fetchTeamMembers();
    if (project && user.id === project.owner_id) {
      refreshPendingTasks();
    }
  }, [project, user.id]);

  const handleTaskUpdate = async (taskId, updates) => {
    await updateTask(taskId, updates);
  };

  const handleTaskDelete = (taskId) => {
    setTaskToDelete(taskId);
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      setTaskToDelete(null);
      setShowConfirmDeleteModal(false);
      setShowDetailModal(false);
    }
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setShowDetailModal(false);
    setShowTaskModal(true);
  };

  const handleModalClose = () => {
    setTaskToEdit(null);
    setShowTaskModal(false);
  };

  const filterButtons = [
    { id: 'all', label: `All` },
    { id: 'incomplete', label: `Active` },
    { id: 'completed', label: `Done` }
  ];

  const isOwner = user.id === project?.owner_id;

  return (
    <div className="p-8 fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="btn-glass px-4 py-2 rounded-xl text-accent hover:opacity-80 mb-4 flex items-center space-x-2"
        >
          <ArrowLeft size={20} />
          <span>Back to Projects</span>
        </button>
        
        <div className="glass-intense p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">{project.name}</h1>
              <div className="flex items-center space-x-4 mt-4 text-sm text-secondary">
                <span className="flex items-center space-x-1"><Users size={16} /> <span>{totalTeamMembersCount} members</span></span>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setShowTaskModal(true);
                }}
                className="hidden md:flex btn-glass px-6 py-3 rounded-xl bg-green-500 bg-opacity-20 text-green-800 dark:text-green-300 border border-green-500/30 hover:bg-opacity-30 items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Task</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'tasks' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}
        >
          My Tasks
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'pending' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}
          >
            Pending Approval <span className="ml-2 bg-accent text-accent-text rounded-full px-2 py-0.5 text-xs">{totalPendingCount}</span>
          </button>
        )}
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'roles' ? 'text-primary border-b-2 border-accent' : 'text-secondary'}`}
        >
          Roles
        </button>
      </div>

      {activeTab === 'tasks' && (
        <div>
          {/* Filter Buttons */}
          <div className="flex space-x-3 my-8">
            {filterButtons.map(button => (
              <button
                key={button.id}
                onClick={() => setFilter(button.id)}
                className={`btn-glass px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${filter === button.id
                    ? 'bg-blue-500 bg-opacity-20 text-accent border-accent/30'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                <span>{button.label}</span>
              </button>
            ))}
          </div>

          {/* Tasks Grid */}
          {tasksLoading ? (
            <div className="flex justify-center py-12">
              <CircularSpinner size="large" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-intense p-12 rounded-2xl text-center">
              <Clipboard size={64} className="text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold text-primary mb-2">No tasks assigned to you</h3>
              <p className="text-secondary">You currently have no tasks in this project for the selected filter.</p>
            </div>
          ) : (
            <div className="card-grid-3">
              {tasks.map((task, index) => {
                if (tasks.length === index + 1) {
                  return <div ref={lastTaskElementRef} key={task.id}><TaskCard task={task} user={user} onClick={() => handleTaskClick(task)} /></div>;
                } else {
                  return <TaskCard key={task.id} task={task} user={user} onClick={() => handleTaskClick(task)} />;}
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pending' && (
         <div>
          {/* Pending Tasks Grid */}
          {loadingPending ? (
            <div className="flex justify-center py-12">
              <CircularSpinner size="large" />
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="glass-intense p-12 rounded-2xl text-center">
              <CheckCircle2 size={64} className="text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold text-primary mb-2">No tasks pending approval</h3>
              <p className="text-secondary">There are no tasks waiting for your approval at the moment.</p>
            </div>
          ) : (
            <div className="card-grid-3">
              {pendingTasks.map((task, index) => {
                if (pendingTasks.length === index + 1) {
                  return <div ref={lastPendingTaskElementRef} key={task.id}><TaskCard task={task} user={user} onClick={() => handleTaskClick(task)} /></div>;
                } else {
                  return <TaskCard key={task.id} task={task} user={user} onClick={() => handleTaskClick(task)} />;}
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <ProjectRoleManager project={project} user={user} />
      )}

      <TaskModal
        isOpen={showTaskModal}
        onClose={handleModalClose}
        onTaskSaved={() => {
          refreshTasks();
          handleModalClose();
        }}
        user={user}
        project={project}
        taskToEdit={taskToEdit}
      />

      <TaskDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          if (isOwner) refreshPendingTasks();
        }}
        task={selectedTask}
        onEdit={handleEditTask}
        onDeleteTask={handleTaskDelete}
        user={user}
        teamMembers={teamMembers}
        project={project}
      />

      <ConfirmModal
        isOpen={showConfirmDeleteModal}
        message="Are you sure you want to delete this task?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirmDeleteModal(false)}
      />

      {/* FAB for Mobile */}
      {isOwner && (
        <button
          onClick={() => {
            setTaskToEdit(null);
            setShowTaskModal(true);
          }}
          className="md:hidden fixed bottom-24 right-6 z-20 p-4 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}

const TeamTasksPage = ({ user }) => {
  const { teamId, projectId } = useParams();
  const navigate = useNavigate();
  const { teams, loading: loadingTeamsContext, deleteTeam: deleteTeamContext, updateTeam: updateTeamContext } = useTeams();
  const { projects, loading: loadingProjectsContext, fetchProjects, addProject, updateProject, deleteProject } = useProjects();
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingSingleProject, setLoadingSingleProject] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);

  useEffect(() => {
    if (projectId) {
      setLoadingSingleProject(true);
      projectAPI.getById(projectId)
        .then(data => {
          setSelectedProject(data);
        })
        .catch(error => {
          console.error("Error fetching single project:", error);
          setSelectedProject(null);
        })
        .finally(() => {
          setLoadingSingleProject(false);
        });
    } else {
      setSelectedProject(null);
    }
  }, [projectId]);

  const team = teams.find(t => t.id === teamId);

  const [showConfirmDeleteTeam, setShowConfirmDeleteTeam] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const handleDeleteTeam = async () => {
    try {
      await teamAPI.delete(teamId);
      deleteTeamContext(teamId);
      window.location.href = '/teams';
    } catch (error) {
      console.error('Error deleting team:', error);
    } finally {
      setShowConfirmDeleteTeam(false);
    }
  };

  const handleAddMember = async (newMember) => {
    try {
      const updatedTeam = await teamAPI.addMember(teamId, newMember.id);
      updateTeamContext(updatedTeam);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setShowAddMemberModal(false);
    }
  };

  const handleSetSelectedProject = (project) => {
    navigate(`/teams/${teamId}/projects/${project.id}`);
  }

  if (loadingTeamsContext || loadingProjectsContext || loadingSingleProject) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularSpinner size="large" />
      </div>
    );
  }

  if ((projectId && !selectedProject) || (teamId && !team && !projectId)) {
    return <div className="text-center text-primary text-xl mt-8">Not found.</div>;
  }

  if (selectedProject) {
    return (
      <ProjectView
        project={selectedProject}
        user={user}
        onBack={() => navigate(-1)}
      />
    );
  }

  return (
    <>
      <div className="p-8 fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Team Projects</h1>
              <p className="text-secondary">Collaborate with your team on shared projects</p>
            </div>
            <button
              onClick={() => setShowProjectModal(true)}
              className="btn-glass px-6 py-3 rounded-xl bg-green-500 bg-opacity-20 text-green-800 dark:text-green-300 border border-green-500/30 hover:bg-opacity-30 flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Add Project</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.filter(p => p.team_id === teamId).length === 0 && !loadingProjectsContext ? (
          <div className="glass-intense p-12 rounded-2xl text-center">
            <Users size={64} className="text-secondary mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-primary mb-2">No projects in this team</h3>
            <p className="text-secondary">Get started by creating a new project.</p>
          </div>
        ) : (
          <div className="card-grid-3">
            {projects.filter(p => p.team_id === teamId).map((project, index) => {
              console.log('Rendering team project card:', project.name);
              return (
              <div
                key={project.id}
                className="task-card p-6 group flex flex-col justify-between relative hover:scale-105 hover:shadow-lg transition-all duration-300"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    {/* <Target size={24} className="text-secondary" /> */}
                  </div>
                  
                  <p className="text-secondary mb-4 line-clamp-3">
                    {project.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm text-secondary mb-4">
                    <div className="flex items-center space-x-1">
                      <Users size={16} />
                      <span>{project.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSetSelectedProject(project)}
                    className="w-full btn-glass px-4 py-2 rounded-xl text-accent hover:opacity-80 bg-blue-500 bg-opacity-10 hover:bg-opacity-20 border border-accent/20"
                  >
                    View Tasks
                  </button>
                </div>
              </div>
            )})}
            </div>
        )}

        <ProjectModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onProjectCreated={(newProject) => {
            addProject(newProject);
            setShowProjectModal(false);
          }}
        />
      </div>

      <ConfirmModal
        isOpen={showConfirmDeleteTeam}
        message="Are you sure you want to delete this team? This action cannot be undone and all associated projects will be lost."
        onConfirm={handleDeleteTeam}
        onCancel={() => setShowConfirmDeleteTeam(false)}
      />

      <AddMemberModal
        isOpen={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        team={{ id: teamId }}
        onMemberAdded={handleAddMember}
      />
    </>
  );
};

export default TeamTasksPage;