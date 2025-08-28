import { useState, useEffect, useCallback, useRef } from 'react';
import { taskAPI } from '../utils/api';
import { useErrorContext } from '../context/ErrorContext';
import useWebSocket from './useWebSocket';
import { useAuth } from './useAuth';

const taskCache = new Map();

export const useTasks = (projectId = null) => {
  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const { showError } = useErrorContext();
  const { lastMessage } = useWebSocket(projectId);
  const { user } = useAuth();

  useEffect(() => {
    if (lastMessage && user) {
        const { type, data } = lastMessage;
        if (type === 'task_updated') {
          console.log('WebSocket: Received task_updated', data);
          setTasks(prevTasks => {
            console.log('WebSocket: Old task state:', prevTasks.find(t => t.id === data.id));
            return prevTasks.map(task => task.id === data.id ? data : task)
          });
        } else if (type === 'task_created') {
            const isForCurrentProject = projectId && data.project_id === projectId;
            const isAssignedToCurrentUserInMyTasks = !projectId && data.assignee_ids.includes(user.id);

            if (isForCurrentProject || isAssignedToCurrentUserInMyTasks) {
                setTasks(prevTasks => [data, ...prevTasks]);
            }
        } else if (type === 'task_deleted') {
            setTasks(prevTasks => prevTasks.filter(task => task.id !== data.id));
        }
    }
  }, [lastMessage, user, projectId]);

  const cacheKey = `${projectId || 'my'}-${filter}`;

  const loadTasks = useCallback(async (currentPage, isRefresh = false) => {
    if (loading || (!isRefresh && !hasMore)) {
      return;
    }

    if (!isRefresh && taskCache.has(cacheKey)) {
      const cached = taskCache.get(cacheKey);
      if (cached.page >= currentPage) {
        setTasks(cached.tasks);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        return;
      }
    }

    setLoading(true);
    try {
      let response;
      const perPage = 20;
      if (projectId) {
        response = await taskAPI.getByProject(projectId, filter === 'all' ? null : filter, currentPage, perPage);
      } else {
        response = await taskAPI.getMy(filter === 'all' ? null : filter, currentPage, perPage);
      }
      
      const newTasks = response.tasks || [];
      const totalCount = response.total_count || 0;

      setTasks(prevTasks => {
        const updatedTasks = isRefresh ? newTasks : [...prevTasks, ...newTasks];
        const newHasMore = updatedTasks.length < totalCount;

        // Update cache
        taskCache.set(cacheKey, { tasks: updatedTasks, page: currentPage + 1, hasMore: newHasMore });
        return updatedTasks;
      });

      setHasMore(prevHasMore => {
        const newHasMore = (isRefresh ? newTasks.length : tasks.length + newTasks.length) < totalCount;
        return newHasMore;
      });

      setPage(currentPage + 1);

    } catch (error) {
      showError('Error loading tasks. Please try again later.');
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, filter, showError, cacheKey]);

  useEffect(() => {
    const cached = taskCache.get(cacheKey);
    if (cached) {
      setTasks(cached.tasks);
      setPage(cached.page);
      setHasMore(cached.hasMore);
    } else {
      setTasks([]);
      setPage(1);
      setHasMore(true);
      loadTasks(1, true);
    }
  }, [projectId, filter, cacheKey, loadTasks]);


  const refresh = useCallback(() => {
    taskCache.delete(cacheKey);
    setTasks([]);
    setPage(1);
    setHasMore(true);
    loadTasks(1, true);
  }, [cacheKey, loadTasks]);

  const loadMore = () => {
    if (!loading && hasMore) {
      loadTasks(page);
    }
  };

  const createTask = async (taskData) => {
    try {
      const newTask = await taskAPI.create(taskData);
      setTasks(prevTasks => [newTask, ...prevTasks]);
      return { success: true, task: newTask };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to create task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const updateTask = async (taskId, updates) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(updatedTasks);

    try {
      const updatedTask = await taskAPI.update(taskId, updates);
      // Optionally, update the task in state again with the response from the server
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      return { success: true, task: updatedTask };
    } catch (error) {
      setTasks(originalTasks); // Rollback on error
      const errorMessage = error.response?.data?.detail || 'Failed to update task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const deleteTask = async (taskId) => {
    const originalTasks = tasks; // Store original tasks for rollback
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId)); // Optimistic update
    try {
      await taskAPI.delete(taskId);
      return { success: true };
    } catch (error) {
      setTasks(originalTasks); // Rollback on error
      const errorMessage = error.response?.data?.detail || 'Failed to delete task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const submitTask = async (taskId) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: 'pending_approval' } : task
    );
    setTasks(updatedTasks);

    try {
      await taskAPI.submit(taskId);
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to submit task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const recallSubmission = async (taskId) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: 'in_progress' } : task
    );
    setTasks(updatedTasks);

    try {
      await taskAPI.recall(taskId);
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to recall submission';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const approveTask = async (taskId) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task
    );
    setTasks(updatedTasks);

    try {
      await taskAPI.approve(taskId);
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to approve task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const saveTaskContent = async (taskId, submissionContent, user) => {
    const originalTasks = [...tasks];

    const updatedTasks = tasks.map(task => {
      if (task.id === taskId) {
        const newEntry = {
          user_id: user.id,
          username: user.full_name,
          content: submissionContent,
          timestamp: new Date().toISOString(),
        };
        const updatedSubmissionContent = 
          task.submission_content 
            ? [...task.submission_content.filter(s => s.user_id !== user.id), newEntry]
            : [newEntry];

        return { ...task, submission_content: updatedSubmissionContent };
      }
      return task;
    });
    setTasks(updatedTasks);

    try {
      await taskAPI.saveContent(taskId, submissionContent);
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to save content';
      showError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const completePersonalTask = async (taskId) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: 'completed', completed_at: new Date().toISOString() } : task
    );
    setTasks(updatedTasks);

    try {
      const updatedTask = await taskAPI.completePersonal(taskId);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to complete task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  const reopenTask = async (taskId) => {
    const originalTasks = [...tasks];
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: 'in_progress', completed_at: null } : task
    );
    setTasks(updatedTasks);

    try {
      const updatedTask = await taskAPI.reopen(taskId);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      return { success: true };
    } catch (error) {
      setTasks(originalTasks);
      const errorMessage = error.response?.data?.detail || 'Failed to reopen task';
      showError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  return {
    tasks,
    loading,
    filter,
    setFilter,
    hasMore,
    loadMore,
    createTask,
    updateTask,
    deleteTask,
    submitTask,
    recallSubmission,
    approveTask,
    saveTaskContent,
    completePersonalTask,
    reopenTask,
    refresh
  };
};
