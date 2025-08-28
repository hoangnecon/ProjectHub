import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClipboardList, RefreshCw, CheckCircle, Plus, Clipboard } from 'lucide-react';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import CircularSpinner from '../components/CircularSpinner';
import TaskDetailModal from '../components/TaskDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import { useErrorContext } from '../context/ErrorContext';

const MyTasksTab = ({ user, onAddTask, onEditTask, refreshKey }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { tasks, loading: tasksLoading, deleteTask, refresh: refreshTasks, hasMore, loadMore } = useTasks(null);
  const { showError } = useErrorContext();

  useEffect(() => {
    if (refreshKey > 0) {
      refreshTasks();
    }
  }, [refreshKey, refreshTasks]);

  const [showTeamTasks, setShowTeamTasks] = useState(true);

  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const handleTaskDelete = (taskId) => {
    setTaskToDelete(taskId);
    setShowConfirmDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      const result = await deleteTask(taskToDelete);
      if (!result.success) {
        showError(result.error);
      }
      setTaskToDelete(null);
      setShowConfirmDeleteModal(false);
      setShowDetailModal(false);
    }
  };
  
  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    refreshTasks();
  };

  const displayedTasks = showTeamTasks ? tasks : tasks.filter(task => !task.project_id);

  // Infinite Scroll Logic
  const observer = useRef();
  const lastTaskElementRef = useCallback(node => {
    if (tasksLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [tasksLoading, hasMore, loadMore]);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">My Tasks</h1>
            <p className="text-secondary">Your personal to-do list</p>
          </div>
          <button
            onClick={onAddTask}
            className="hidden md:flex btn-glass px-6 py-3 rounded-xl bg-green-500 bg-opacity-20 text-green-800 dark:text-green-300 border border-green-500 border-opacity-30 hover:bg-opacity-30 items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center space-x-4 mb-8">
        <label htmlFor="team-tasks-toggle" className="text-primary font-medium cursor-pointer">
          Show Team Project Tasks
        </label>
        <button
          id="team-tasks-toggle"
          onClick={() => setShowTeamTasks(!showTeamTasks)}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900 focus:ring-blue-500 ${
            showTeamTasks ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${
              showTeamTasks ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Tasks Grid */}
      <div className="space-y-6">
        <div className="card-grid-3">
          {displayedTasks.map((task, index) => {
            if (displayedTasks.length === index + 1) {
              return <div ref={lastTaskElementRef} key={task.id}><TaskCard task={task} user={user} onClick={() => { setSelectedTask(task); setShowDetailModal(true); }} /></div>;
            } else {
              return <TaskCard key={task.id} task={task} user={user} onClick={() => { setSelectedTask(task); setShowDetailModal(true); }} />;}
          })}
        </div>
        {tasksLoading && (
          <div className="flex justify-center py-12">
            <CircularSpinner size="large" />
          </div>
        )}
        {!tasksLoading && tasks.length === 0 && (
          <div className="glass-intense p-12 rounded-2xl text-center">
            <span className="text-6xl mb-4 block text-secondary"><Clipboard size={64} /></span>
            <h3 className="text-xl font-semibold text-primary mb-2">No personal tasks</h3>
            <p className="text-secondary">Start by creating your first personal task.</p>
          </div>
        )}
      </div>

      <TaskDetailModal
        isOpen={showDetailModal}
        onClose={handleDetailModalClose}
        task={selectedTask}
        onEdit={onEditTask}
        onDeleteTask={handleTaskDelete}
        user={user}
      />

      <ConfirmModal
        isOpen={showConfirmDeleteModal}
        message="Are you sure you want to delete this task?"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowConfirmDeleteModal(false)}
      />
    </div>
  );
};

export default MyTasksTab;
