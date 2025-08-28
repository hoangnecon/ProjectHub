import React, { useState, useEffect } from 'react';
import CircularSpinner from './CircularSpinner';
import { format } from 'date-fns';
import { taskAPI } from '../utils/api';
import ProjectDisplay from './ProjectDisplay';
import UserDisplay from './UserDisplay';
import { Users, CheckCircle, RefreshCw, Hourglass, AlertTriangle, X, Hand, Edit } from 'lucide-react';
import AssigneeListModal from './AssigneeListModal';
import SubmissionModal from './SubmissionModal';
import { useTasks } from '../hooks/useTasks';
import useWebSocket from '../hooks/useWebSocket';

const DetailSection = ({ label, children, isLoading }) => (
  <div>
    <p className="text-sm font-medium text-gray-400">{label}:</p>
    {isLoading ? <div className="h-6 mt-1 w-3/4 bg-gray-700 rounded animate-pulse"></div> : <div className="text-gray-300">{children}</div>}
  </div>
);

const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onDeleteTask, user, project }) => {
  const [currentTask, setCurrentTask] = useState(task);
  const [isDetailsLoading, setDetailsLoading] = useState(false);
  const [showAssigneeListModal, setShowAssigneeListModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const { submitTask, recallSubmission, approveTask, saveTaskContent, completePersonalTask, reopenTask } = useTasks(task?.project_id);
  const { lastMessage } = useWebSocket(currentTask?.project_id);

  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;
      if (type === 'task_updated' && data.id === currentTask?.id) {
        setCurrentTask(data);
      }
    }
  }, [lastMessage, currentTask?.id]);

  useEffect(() => {
    if (isOpen && task) {
      setCurrentTask(task);
      setDetailsLoading(true);
      
      taskAPI.getById(task.id)
        .then(fullTaskData => {
          setCurrentTask(fullTaskData);
        })
        .catch(err => console.error("Failed to fetch task details", err))
        .finally(() => setDetailsLoading(false));
    }
  }, [isOpen, task]);

  if (!isOpen || !currentTask) return null;

  const handleSaveContent = async (submissionContent) => {
    setShowSubmissionModal(false);
    const result = await saveTaskContent(currentTask.id, submissionContent, user);
    if (result.success) {
      const fullTaskData = await taskAPI.getById(task.id);
      setCurrentTask(fullTaskData);
    }
  };

  const handleSubmitForApproval = async () => { await submitTask(currentTask.id); onClose(); };
  const handleRecallSubmission = async () => { await recallSubmission(currentTask.id); onClose(); };
  const handleApproveTask = async () => { await approveTask(currentTask.id); onClose(); };
  const handleCompletePersonal = async () => { await completePersonalTask(currentTask.id); onClose(); };
  const handleReopen = async () => { await reopenTask(currentTask.id); onClose(); };

  const getPriorityClass = (priority) => {
    const classes = { critical: 'priority-critical', high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };
    return classes[priority] || 'priority-medium';
  };

  const getStatusClass = (status) => {
    const classes = { completed: 'status-completed', in_progress: 'status-in_progress', todo: 'status-todo', pending_approval: 'status-approval' };
    return classes[status] || 'status-todo';
  };

  const getStatusIcon = (status) => {
    const icons = { completed: <CheckCircle size={16} />, in_progress: <RefreshCw size={16} />, todo: <Hourglass size={16} />, pending_approval: <Hand size={16} /> };
    return icons[status] || <Hourglass size={16} />;
  };

  const isPersonalTask = currentTask.project_id === null || (project && project.team_id === null);
  const isOverdue = currentTask.deadline && new Date(currentTask.deadline) < new Date() && currentTask.status !== 'completed';
  const isAssignee = currentTask.assignee_ids?.includes(user?.id);
  const isProjectOwner = project?.owner_id === user?.id;
  const isTaskOwner = currentTask.owner_id === user?.id;

  const canSubmitForApproval = !isPersonalTask && isAssignee && (currentTask.status === 'todo' || currentTask.status === 'in_progress');
  const canRecall = !isPersonalTask && isAssignee && currentTask.status === 'pending_approval';
  const canApprove = !isPersonalTask && isProjectOwner && currentTask.status === 'pending_approval';

  const canCompletePersonal = isPersonalTask && isTaskOwner && (currentTask.status === 'todo' || currentTask.status === 'in_progress');
  const canReopenPersonal = isPersonalTask && isTaskOwner && currentTask.status === 'completed';

  const canDelete = (isPersonalTask && isTaskOwner) || (!isPersonalTask && isProjectOwner);
  const canEdit = (isPersonalTask && isTaskOwner) || (!isPersonalTask && isProjectOwner);

  return (
    <>
      <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
        <div className="glass-intense p-6 w-full max-w-2xl rounded-2xl slide-in-up overflow-y-auto max-h-[90vh]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{currentTask.title || "Task Details"}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl"><X size={24} /></button>
          </div>

          <div className="space-y-4 text-gray-300">
            <DetailSection label="Description" isLoading={isDetailsLoading}>
              <p>{currentTask.description}</p>
            </DetailSection>

            <DetailSection label="Notes" isLoading={isDetailsLoading}>
              {currentTask.notes && <p>{currentTask.notes}</p>}
            </DetailSection>

            <DetailSection label="Submission Content" isLoading={isDetailsLoading}>
              {currentTask.submission_content && currentTask.submission_content.length > 0 && (
                <div className="space-y-2">
                  {currentTask.submission_content.map((entry, index) => (
                    <div key={index} className="glass-card p-3 rounded-lg border border-gray-700">
                      <p className="text-gray-200 whitespace-pre-wrap">
                        <span className="font-medium text-blue-400">[{entry.username}]</span> {entry.content}
                      </p>
                      <span className="text-xs text-gray-500">{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>

            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-gray-400">Status:</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusClass(currentTask.status)}`}>
                  <span>{getStatusIcon(currentTask.status)}</span>
                  <span>{currentTask.status.replace('_', ' ').toUpperCase()}</span>
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">Priority:</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityClass(currentTask.priority)}`}>
                  {currentTask.priority.toUpperCase()}
                </span>
              </div>
              {currentTask.deadline && (
                <div>
                  <p className="text-sm font-medium text-gray-400">Deadline:</p>
                  <span className={`text-sm ${isOverdue ? 'text-red-400' : ''}`}>
                    {format(new Date(currentTask.deadline), 'dd/MM/yyyy')}
                    {isOverdue && <span className="ml-2 text-red-500"><AlertTriangle size={16} /> OVERDUE</span>}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-400">Assignees:</p>
                {currentTask.assignee_ids && currentTask.assignee_ids.length > 0 ? (
                  <button onClick={() => setShowAssigneeListModal(true)} className="flex items-center space-x-1 text-blue-400 hover:underline">
                    <Users size={16} />
                    <span>{currentTask.assignee_ids.length} assignees</span>
                  </button>
                ) : <p>None</p>}
              </div>
              <DetailSection label="Assigned By" isLoading={isDetailsLoading}>
                <UserDisplay userId={currentTask.assigned_by} />
              </DetailSection>
              <div>
                <p className="text-sm font-medium text-gray-400">Project:</p>
                {currentTask.project_id ? <ProjectDisplay projectId={currentTask.project_id} /> : <p>Personal Task</p>}
              </div>
            </div>

            <DetailSection label="History" isLoading={isDetailsLoading}>
              <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  {currentTask.created_at && <p>Created: {format(new Date(currentTask.created_at), 'dd/MM/yyyy HH:mm')}</p>}
                  {currentTask.assigned_at && <p>Assigned: {format(new Date(currentTask.assigned_at), 'dd/MM/yyyy HH:mm')}</p>}
                  {currentTask.accepted_at && <p>Accepted: {format(new Date(currentTask.accepted_at), 'dd/MM/yyyy HH:mm')}</p>}
                  {currentTask.completed_at && <p>Completed: {format(new Date(currentTask.completed_at), 'dd/MM/yyyy HH:mm')}</p>}
              </div>
            </DetailSection>
          </div>

          {/* --- ACTION BUTTONS --- */}
          <div className="flex justify-end flex-wrap gap-4 mt-6">
            {isPersonalTask ? (
              // Buttons for Personal Tasks
              <>
                {canEdit && (
                    <button onClick={() => onEdit(currentTask)} className="btn-glass px-4 py-2 rounded-xl bg-gray-600 bg-opacity-20 text-gray-300 border border-gray-500 border-opacity-30 hover:bg-opacity-30 flex items-center space-x-2">
                        <Edit size={16} />
                        <span>Edit Task</span>
                    </button>
                )}
                {canCompletePersonal && (
                    <button onClick={handleCompletePersonal} className="btn-glass px-4 py-2 rounded-xl bg-green-600 bg-opacity-20 text-green-300 border border-green-500 border-opacity-30 hover:bg-opacity-30">
                        Mark as Complete
                    </button>
                )}
                {canReopenPersonal && (
                    <button onClick={handleReopen} className="btn-glass px-4 py-2 rounded-xl bg-yellow-600 bg-opacity-20 text-yellow-300 border border-yellow-500 border-opacity-30 hover:bg-opacity-30">
                        Re-open Task
                    </button>
                )}
                <button onClick={() => setShowSubmissionModal(true)} className="btn-glass px-4 py-2 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30 hover:bg-opacity-30">
                    Add/Edit Content
                </button>
                {canDelete && <button onClick={() => onDeleteTask(currentTask.id)} className="btn-glass px-4 py-2 rounded-xl bg-red-600 bg-opacity-20 text-red-300 border border-red-500 border-opacity-30 hover:bg-opacity-30">Delete Task</button>}
              </>
            ) : (
              // Buttons for Project Tasks
              <>
                {canEdit && (
                    <button onClick={() => onEdit(currentTask)} className="btn-glass px-4 py-2 rounded-xl bg-gray-600 bg-opacity-20 text-gray-300 border border-gray-500 border-opacity-30 hover:bg-opacity-30 flex items-center space-x-2">
                        <Edit size={16} />
                        <span>Edit Task</span>
                    </button>
                )}
                {canSubmitForApproval && (
                  <>
                    <button onClick={() => setShowSubmissionModal(true)} className="btn-glass px-4 py-2 rounded-xl bg-blue-600 bg-opacity-20 text-blue-300 border border-blue-500 border-opacity-30 hover:bg-opacity-30">
                      Add/Edit Submission
                    </button>
                    <button onClick={handleSubmitForApproval} className="btn-glass px-4 py-2 rounded-xl bg-green-600 bg-opacity-20 text-green-300 border border-green-500 border-opacity-30 hover:bg-opacity-30">
                      Submit for Approval
                    </button>
                  </>
                )}
                {canRecall && <button onClick={handleRecallSubmission} className="btn-glass px-4 py-2 rounded-xl bg-yellow-600 bg-opacity-20 text-yellow-300 border border-yellow-500 border-opacity-30 hover:bg-opacity-30">Recall Submission</button>}
                {canApprove && <button onClick={handleApproveTask} className="btn-glass px-4 py-2 rounded-xl bg-purple-600 bg-opacity-20 text-purple-300 border border-purple-500 border-opacity-30 hover:bg-opacity-30">Approve Task</button>}
                {canDelete && <button onClick={() => onDeleteTask(currentTask.id)} className="btn-glass px-4 py-2 rounded-xl bg-red-600 bg-opacity-20 text-red-300 border border-red-500 border-opacity-30 hover:bg-opacity-30">Delete Task</button>}
              </>
            )}
          </div>
        </div>
      </div>
      {showAssigneeListModal && (
        <AssigneeListModal
          isOpen={showAssigneeListModal}
          onClose={() => setShowAssigneeListModal(false)}
          projectId={currentTask.project_id}
          assigneeIds={currentTask.assignee_ids}
        />
      )}
      {showSubmissionModal && (
        <SubmissionModal
          isOpen={showSubmissionModal}
          onClose={() => setShowSubmissionModal(false)}
          onSubmit={handleSaveContent}
          existingSubmissions={currentTask.submission_content || []}
          user={user}
        />
      )}
    </>
  );
};

export default TaskDetailModal;
