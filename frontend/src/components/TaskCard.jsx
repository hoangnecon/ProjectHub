import React from 'react';
import { Users, CheckCircle, RefreshCw, Hourglass, AlertTriangle, Clock, Hand, Calendar, ClipboardList, Award } from 'lucide-react';

// Define the component function first
const TaskCardComponent = ({ task, user, onClick }) => {
  const getPriorityClass = (priority) => {
    const classes = {
      critical: 'priority-critical',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low'
    };
    return classes[priority] || 'priority-medium';
  };

  const getStatusClass = (status) => {
    const classes = {
      completed: 'status-completed',
      in_progress: 'status-in_progress',
      todo: 'status-todo',
      pending_approval: 'status-approval'
    };
    return classes[status] || 'status-todo';
  };

  const getStatusIcon = (status) => {
    const icons = {
      completed: <CheckCircle size={16} />,
      in_progress: <RefreshCw size={16} />,
      todo: <Hourglass size={16} />,
      pending_approval: <Hand size={16} />
    };
    return icons[status] || <Hourglass size={16} />;
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';

  return (
    <div className="task-card p-6 cursor-pointer group relative" onClick={onClick}>
      {task.project && task.project.team_id && (
        <div className="absolute top-2 right-2 px-2 py-1 bg-gray-600 bg-opacity-50 text-gray-300 text-xs rounded-full font-medium">
          Team Project
        </div>
      )}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-300 transition-colors">
            {task.title}
          </h3>
          <div className="flex items-center space-x-2 mb-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(task.priority)}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusClass(task.status)}`}>
              <span>{getStatusIcon(task.status)}</span>
              <span>{task.status.replace('_', ' ').toUpperCase()}</span>
            </span>
            {isOverdue && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500 bg-opacity-20 text-red-300 border border-red-500 border-opacity-30 animate-pulse">
                <AlertTriangle size={16} /> OVERDUE
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-gray-300 mb-4 line-clamp-2">
        {task.description}
      </p>

      {task.notes && (
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">Notes:</span> {task.notes}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        {task.assignee_ids && task.assignee_ids.length > 0 && (
          <div className="flex items-center space-x-1">
            <Users size={16} />
            <span>{task.assignee_ids.length} assignees</span>
          </div>
        )}

        {task.deadline && (
          <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-400' : ''}`}>
            <Clock size={16} />
            <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}
        
        {task.created_at && (
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
        )}
        
        {task.assigned_at && (
          <div className="flex items-center space-x-1">
            <ClipboardList size={16} />
            <span>Assigned: {new Date(task.assigned_at).toLocaleDateString()}</span>
          </div>
        )}
        
        {task.accepted_at && (
          <div className="flex items-center space-x-1">
            <Hand size={16} />
            <span>Accepted: {new Date(task.accepted_at).toLocaleDateString()}</span>
          </div>
        )}
        
        {task.completed_at && (
          <div className="flex items-center space-x-1">
            <Award size={16} />
            <span>Completed: {new Date(task.completed_at).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component
const TaskCard = React.memo(TaskCardComponent);

// Export the memoized component
export default TaskCard;