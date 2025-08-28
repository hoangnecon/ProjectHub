import React, { useState, useEffect, useRef, useCallback } from 'react';
import { projectMemberAPI } from '../utils/api';
import { X } from 'lucide-react';
import CircularSpinner from './CircularSpinner';

const AssigneeListModal = ({ isOpen, onClose, projectId, assigneeIds }) => {
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const observer = useRef();
  const lastUserElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchAssignedUsers = async (currentPage, isRefresh = false) => {
    if (!projectId || !assigneeIds || assigneeIds.length === 0 || loading || (!isRefresh && !hasMore)) return;

    setLoading(true);
    try {
      const perPage = 20; // Adjust as needed
      const response = await projectMemberAPI.getForProject(projectId, currentPage, perPage);
      
      // Filter members to only include those in assigneeIds
      const newAssignedUsers = (response.members || []).filter(member => assigneeIds.includes(member.user_id));
      const totalCount = response.total_count || 0; // This total count is for all project members, not just assignees

      setAssignedUsers(prevUsers => isRefresh ? newAssignedUsers : [...prevUsers, ...newAssignedUsers]);
      // Simplified hasMore check for assignees, might need refinement if total_count is for all members
      setHasMore( (isRefresh ? newAssignedUsers.length : assignedUsers.length + newAssignedUsers.length) < assigneeIds.length );
      setPage(currentPage + 1);

    } catch (error) {
      console.error("Error fetching assigned users", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchAssignedUsers(page);
    }
  };

  const refreshAssignedUsers = () => {
    setAssignedUsers([]);
    setPage(1);
    setHasMore(true);
    fetchAssignedUsers(1, true);
  };

  useEffect(() => {
    if (isOpen) {
      refreshAssignedUsers();
    }
  }, [isOpen, projectId, assigneeIds]); // Re-fetch when modal opens or project/assignees change

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="glass-intense p-6 w-full max-w-md rounded-2xl slide-in-up overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assignees</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white text-xl"
          >
            <X size={24} />
          </button>
        </div>

        {assignedUsers && assignedUsers.length > 0 ? (
          <div className="space-y-3">
            {assignedUsers.map((member, index) => {
              if (assignedUsers.length === index + 1) {
                return (
                  <div ref={lastUserElementRef} key={member.user_id} className="flex items-center justify-between glass p-3 rounded-xl">
                    <span className="text-sm text-gray-800 dark:text-white">{member.user.username} ({member.role})</span>
                  </div>
                );
              } else {
                return (
                  <div key={member.user_id} className="flex items-center justify-between glass p-3 rounded-xl">
                    <span className="text-sm text-gray-800 dark:text-white">{member.user.username} ({member.role})</span>
                  </div>
                );
              }
            })}
            {loading && <div className="flex justify-center py-4"><CircularSpinner size="medium" /></div>}
          </div>
        ) : (
          <p className="text-gray-400">No assignees for this task.</p>
        )}
      </div>
    </div>
  );
};

export default AssigneeListModal;
