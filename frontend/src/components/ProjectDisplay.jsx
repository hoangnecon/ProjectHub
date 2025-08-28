import React, { useState, useEffect } from 'react';
import { projectAPI } from '../utils/api';

// Simple in-memory cache for project names
const projectCache = {};

const ProjectDisplay = ({ projectId }) => {
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (projectId) {
      // Check cache first
      if (projectCache[projectId]) {
        setProjectName(projectCache[projectId]);
        return;
      }

      // If not in cache, fetch from API
      projectAPI.getById(projectId)
        .then(data => {
          const name = data.name || 'Unknown Project';
          setProjectName(name);
          projectCache[projectId] = name; // Store in cache
        })
        .catch(err => {
          console.error(`Failed to fetch project ${projectId}`, err);
          setProjectName('Unknown Project');
        });
    }
  }, [projectId]);

  return <p>{projectName}</p>;
};

export default ProjectDisplay;