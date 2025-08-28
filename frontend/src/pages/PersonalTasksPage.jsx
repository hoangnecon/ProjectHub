import React, { useState, useEffect, useRef, useCallback } from 'react';
import { projectAPI } from '../utils/api';
import TaskModal from '../components/TaskModal';
import ProjectModal from '../components/ProjectModal';
import ProjectCard from '../components/ProjectCard';

import CircularSpinner from '../components/CircularSpinner';
import MyTasksTab from './MyTasksTab';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import ConfirmModal from '../components/ConfirmModal';
import { useErrorContext } from '../context/ErrorContext';
import TaskDetailModal from '../components/TaskDetailModal';
import { ArrowLeft, Plus, Clipboard, User, Calendar, Trash2 } from 'lucide-react';

const PersonalTasksPage = ({ user }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [activeTab, setActiveTab] = useState('myTasks');

  const [showTaskModal, setShowTaskModal] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const [showConfirmDeleteTaskModal, setShowConfirmDeleteTaskModal] = useState(false);
  const [taskToDeleteFromPersonal, setTaskToDeleteFromPersonal] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { showError } = useErrorContext();

  const { tasks, loading: tasksLoading, filter, setFilter, deleteTask, refresh: refreshTasks, hasMore: tasksHasMore, loadMore: tasksLoadMore } = useTasks(selectedProject?.id);

  const loadProjects = useCallback(async (currentPage) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await projectAPI.getPersonal(currentPage, 20);
      setProjects(prev => currentPage === 1 ? data.projects : [...prev, ...data.projects]);
      setHasMore(data.projects.length > 0 && (currentPage * 20) < data.total_count);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error loading personal projects:', error);
      showError('Failed to load personal projects.');
    } finally {
      setLoading(false);
    }
  }, [loading, showError]);

  useEffect(() => {
    if (activeTab === 'personalProjects') {
      setProjects([]);
      setPage(1);
      setHasMore(true);
      loadProjects(1);
    }
  }, [activeTab]);

  const observer = useRef();
  const lastProjectElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadProjects(page);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, page, loadProjects]);

  const taskObserver = useRef();
  const lastTaskElementRef = useCallback(node => {
    if (tasksLoading) return;
    if (taskObserver.current) taskObserver.current.disconnect();
    taskObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && tasksHasMore) {
        tasksLoadMore();
      }
    });
    if (node) taskObserver.current.observe(node);
  }, [tasksLoading, tasksHasMore, tasksLoadMore]);

  const refreshProjects = () => {
      setProjects([]);
      setPage(1);
      setHasMore(true);
      loadProjects(1);
  };

  const handleDeleteProject = async (projectId) => {
    setProjectToDelete(projectId);
    setShowConfirmModal(true);
  };

  const confirmDeleteProject = async () => {
    try {
      await projectAPI.delete(projectToDelete);
      refreshProjects();
    } catch (error) {
      showError(error.message || 'Could not delete project.');
    } finally {
      setShowConfirmModal(false);
      setProjectToDelete(null);
    }
  };

  const handleTaskDelete = (taskId) => {
    setTaskToDeleteFromPersonal(taskId);
    setShowConfirmDeleteTaskModal(true);
  };

  const confirmDeleteTask = async () => {
    if (taskToDeleteFromPersonal) {
      const result = await deleteTask(taskToDeleteFromPersonal);
      if (!result.success) {
        showError(result.error);
      }
      setTaskToDeleteFromPersonal(null);
      setShowConfirmDeleteTaskModal(false);
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

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    refreshTasks();
  };

  const handleTaskSaved = () => {
    if (selectedProject) {
      refreshTasks();
    } else {
      setRefreshKey(prevKey => prevKey + 1);
    }
    handleModalClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const filterButtons = [
    { id: 'all', label: `All` },
    { id: 'incomplete', label: `Active` },
    { id: 'completed', label: `Completed` }
  ];

  if (selectedProject) {
    return (
      <div className="p-8 fade-in">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setSelectedProject(null)}
            className="btn-glass px-4 py-2 rounded-xl text-accent hover:opacity-80 mb-4 flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Back to Personal Projects</span>
          </button>
          
          <div className="glass-intense p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-primary mb-2">{selectedProject.name}</h1>
                <p className="text-secondary">{selectedProject.description}</p>
                <div className="flex items-center space-x-4 mt-4 text-sm text-secondary">
                  <span className="flex items-center space-x-1"><User size={16} /> <span>Personal Project</span></span>
                  <span className="flex items-center space-x-1"><Calendar size={16} /> <span>Created {formatDate(selectedProject.created_at)}</span></span>
                </div>
              </div>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setShowTaskModal(true);
                }}
                className="btn-glass px-6 py-3 rounded-xl bg-green-500 bg-opacity-20 text-green-800 dark:text-green-300 border border-green-500 border-opacity-30 hover:bg-opacity-30 flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-3 mb-8">
          {filterButtons.map(button => (
            <button
              key={button.id}
              onClick={() => setFilter(button.id)}
              className={`btn-glass px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${                filter === button.id
                  ? 'bg-blue-600 bg-opacity-20 text-accent border-accent border-opacity-30'
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
            <h3 className="text-xl font-semibold text-primary mb-2">No tasks in this project</h3>
            <p className="text-secondary">Start by creating the first task.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card-grid-3">
              {tasks.map((task, index) => {
                if (tasks.length === index + 1) {
                  return (
                    <div ref={lastTaskElementRef} key={task.id}>
                      <TaskCard
                        task={task}
                        user={user}
                        onClick={() => {
                          setSelectedTaskDetail(task);
                          setShowDetailModal(true);
                        }}
                      />
                    </div>
                  );
                } else {
                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      user={user}
                      onClick={() => {
                        setSelectedTaskDetail(task);
                        setShowDetailModal(true);
                      }}
                    />
                  );
                }
              })}
            </div>
          </div>
        )}

        <TaskModal
          isOpen={showTaskModal}
          onClose={handleModalClose}
          onTaskSaved={handleTaskSaved}
          user={user}
          projectId={selectedProject.id}
          taskToEdit={taskToEdit}
        />

        <TaskDetailModal
          isOpen={showDetailModal}
          onClose={handleDetailModalClose}
          task={selectedTaskDetail}
          onEdit={handleEditTask}
          onDeleteTask={handleTaskDelete}
          user={user}
          project={selectedProject}
        />

        <ConfirmModal
          isOpen={showConfirmDeleteTaskModal}
          message="Are you sure you want to delete this task?"
          onConfirm={confirmDeleteTask}
          onCancel={() => setShowConfirmDeleteTaskModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Personal Workspace</h1>
            <p className="text-secondary">Manage your personal tasks and projects</p>
          </div>
          
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActiveTab('myTasks')}
          className={`px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base rounded-xl font-medium transition-all ${            activeTab === 'myTasks'
              ? 'btn-glass bg-blue-600 bg-opacity-20 text-accent border-accent border-opacity-30'
              : 'text-secondary hover:text-primary'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setActiveTab('personalProjects')}
          className={`px-4 py-2 text-sm sm:px-6 sm:py-3 sm:text-base rounded-xl font-medium transition-all ${            activeTab === 'personalProjects'
              ? 'btn-glass bg-blue-600 bg-opacity-20 text-accent border-accent border-opacity-30'
              : 'text-secondary hover:text-primary'
          }`}
        >
          Personal Projects
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'myTasks' ? (
        <MyTasksTab 
          user={user} 
          onAddTask={() => { setTaskToEdit(null); setShowTaskModal(true); }}
          onEditTask={handleEditTask}
          refreshKey={refreshKey}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-primary">Your Personal Projects</h2>
            <button
              onClick={() => setShowProjectModal(true)}
              className="hidden md:flex btn-glass px-6 py-3 rounded-xl bg-blue-600 bg-opacity-20 text-accent border-accent border-opacity-30 hover:bg-opacity-30 items-center space-x-2"
            >
              <Plus size={20} />
              <span>New Project</span>
            </button>
          </div>
          {projects.length === 0 && loading ? (
            <div className="flex justify-center py-12">
              <CircularSpinner size="large" />
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-intense p-12 rounded-2xl text-center">
              <User size={64} className="text-secondary mb-4 mx-auto" />
              <h3 className="text-xl font-semibold text-primary mb-2">No personal projects</h3>
              <p className="text-secondary">Create your first personal project to get started.</p>
            </div>
          ) : (
            <div className="card-grid-3">
              {projects.map((project, index) => {
                const card = (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    index={index}
                    type="personal"
                    onCardClick={setSelectedProject}
                    onDeleteClick={handleDeleteProject}
                  />
                );

                if (projects.length === index + 1) {
                  return (
                    <div ref={lastProjectElementRef} key={project.id}>
                      {card}
                    </div>
                  );
                } else {
                  return card;
                }
              })}
            </div>
          )}
          {projects.length > 0 && loading && (
              <div className="flex justify-center py-6">
                  <CircularSpinner size="medium" />
              </div>
          )}

          <ProjectModal
            isOpen={showProjectModal}
            onClose={() => setShowProjectModal(false)}
            onProjectCreated={refreshProjects}
            isPersonal={true}
          />

          <ConfirmModal
            isOpen={showConfirmModal}
            message="Are you sure you want to delete this project? All associated tasks will also be deleted."
            onConfirm={confirmDeleteProject}
            onCancel={() => setShowConfirmModal(false)}
          />
        </div>
      )}

      {activeTab === 'myTasks' && (
        <TaskModal
          isOpen={showTaskModal}
          onClose={handleModalClose}
          onTaskSaved={handleTaskSaved}
          user={user}
          projectId={null}
          taskToEdit={taskToEdit}
        />
      )}

      {/* FAB for Mobile */}
      {((!selectedProject && activeTab === 'myTasks') || selectedProject) && (
        <button
          onClick={() => {
            setTaskToEdit(null);
            setShowTaskModal(true);
          }}
          className="md:hidden fixed bottom-24 right-6 z-35 p-4 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
      {!selectedProject && activeTab === 'personalProjects' && (
        <button
          onClick={() => setShowProjectModal(true)}
          className="md:hidden fixed bottom-24 right-6 z-35 p-4 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};



export default PersonalTasksPage;