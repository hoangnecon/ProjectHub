import React from 'react';
import { Users, Calendar, Building, Target, Trash2 } from 'lucide-react';

const ProjectCardComponent = ({
  project,
  index,
  type = 'personal', // 'personal', 'team', or 'team-project'
  user,
  onCardClick,
  onDeleteClick,
  isOwner // for team-project
}) => {

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

  const handleCardClick = () => {
    if (onCardClick) onCardClick(project);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDeleteClick) onDeleteClick(project.id);
  };

  const isTeamOwner = type === 'team' && project.owner_id === user?.id;

  return (
    <div
      onClick={handleCardClick}
      className="glass-intense p-6 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between transform hover:-translate-y-1 hover:shadow-2xl fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-primary mb-2 truncate pr-4">{project.name}</h3>
          {type === 'team' && <Building size={24} className="text-secondary flex-shrink-0" />}
          {type === 'team-project' && <Target size={24} className="text-secondary flex-shrink-0" />}
        </div>
        <p className="text-primary font-medium text-sm mb-4 h-10 overflow-hidden text-ellipsis">{project.description || 'No description'}</p>
      </div>
      <div className="mt-4">
        {isTeamOwner && (
          <span className="inline-block px-2 py-1 bg-blue-500 bg-opacity-20 text-accent text-xs rounded-full mb-4 border border-accent/30">
            Owner
          </span>
        )}
        <div className="flex justify-between items-center text-sm text-primary">
          {type === 'team' ? (
            <>
              <div className="flex items-center space-x-1">
                <Users size={16} />
                <span>{project.members?.length} {project.members?.length === 1 ? 'member' : 'members'}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar size={16} />
                <span>{new Date(project.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </>
          ) : (
            <span className="text-xs text-secondary font-medium">Created: {formatDate(project.created_at)}</span>
          )}
          
          {(type === 'personal' || (type === 'team-project' && isOwner)) && onDeleteClick && (
            <button
              onClick={handleDelete}
              className="btn-glass p-2 rounded-full text-red-500 hover:bg-red-500/20 transition-colors"
              aria-label="Delete project"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectCard = React.memo(ProjectCardComponent);
export default ProjectCard;