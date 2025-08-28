import React, { useState, useEffect, useRef, useCallback } from 'react';
import { projectMemberAPI } from '../utils/api';
import RoleModal from './RoleModal';
import CircularSpinner from './CircularSpinner';

const ProjectRoleManager = ({ project, user }) => {
  const [members, setMembers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const isOwner = project.owner_id === user.id;

  const observer = useRef();
  const lastMemberElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const fetchMembers = async (currentPage, isRefresh = false) => {
    if (!project || loading || (!isRefresh && !hasMore)) return;

    setLoading(true);
    try {
      const perPage = 20;
      const response = await projectMemberAPI.getForProject(project.id, currentPage, perPage);
      
      const newMembers = response.members || [];
      const totalCount = response.total_count || 0;

      setMembers(prevMembers => isRefresh ? newMembers : [...prevMembers, ...newMembers]);
      setHasMore( (isRefresh ? newMembers.length : members.length + newMembers.length) < totalCount );
      setPage(currentPage + 1);

    } catch (error) {
      console.error("Error fetching project members", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchMembers(page);
    }
  };

  const refreshMembers = () => {
    setMembers([]);
    setPage(1);
    setHasMore(true);
    fetchMembers(1, true);
  };

  useEffect(() => {
    if (project) {
      refreshMembers();
    }
  }, [project]);

  const handleRoleUpdated = () => {
    refreshMembers(); // Refresh the list of members
    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const openRoleModal = (member) => {
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Member Roles</h2>
      </div>
      <div>
        {loading && members.length === 0 ? (
          <div className="flex justify-center py-12"><CircularSpinner size="large" /></div>
        ) : members.length === 0 ? (
          <p className="text-gray-400">No members in this project.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member, index) => {
              if (members.length === index + 1) {
                return (
                  <div ref={lastMemberElementRef} key={member.user_id} className="glass p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{member.user.full_name}</p>
                      <p className="text-sm text-gray-400">@{member.user.username} - <span className="font-medium text-purple-300">{member.role}</span></p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => openRoleModal(member)}
                        className="btn-glass px-3 py-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        Edit Role
                      </button>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={member.user_id} className="glass p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{member.user.full_name}</p>
                      <p className="text-sm text-gray-400">@{member.user.username} - <span className="font-medium text-purple-300">{member.role}</span></p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => openRoleModal(member)}
                        className="btn-glass px-3 py-1 text-xs text-blue-300 hover:text-blue-200"
                      >
                        Edit Role
                      </button>
                    )}
                  </div>
                );
              }
            })}
            {loading && <div className="flex justify-center py-4"><CircularSpinner size="medium" /></div>}
          </div>
        )}
      </div>

      {showRoleModal && selectedMember && (
        <RoleModal
          isOpen={showRoleModal}
          onClose={() => setShowRoleModal(false)}
          onRoleUpdated={handleRoleUpdated}
          project={project}
          member={selectedMember}
        />
      )}
    </div>
  );
};

export default ProjectRoleManager;
