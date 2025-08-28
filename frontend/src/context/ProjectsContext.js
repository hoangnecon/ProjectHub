import React, { createContext, useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import { projectAPI } from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const ProjectsContext = createContext();

export const ProjectsProvider = ({ children }) => {
    const [projects, setProjects] = useState([]);
    const [projectPage, setProjectPage] = useState(1);
    const [hasMoreProjects, setHasMoreProjects] = useState(true);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [error, setError] = useState(null);
    const { isAuthenticated } = useAuth();

    const loadProjects = useCallback(async (currentPage, isRefresh = false) => {
        setLoadingProjects(prevLoading => {
            if (prevLoading) return true; // Already loading, do nothing

            setHasMoreProjects(prevHasMore => {
                if (!isRefresh && !prevHasMore) return true; // No more projects to load

                setError(null);
                (async () => {
                    try {
                        const perPage = 20;
                        const response = await projectAPI.getAll(currentPage, perPage);
                        
                        const newProjects = response.projects || [];
                        const totalCount = response.total_count || 0;

                        setProjects(prevProjects => {
                            const updatedProjects = isRefresh ? newProjects : [...prevProjects, ...newProjects];
                            setHasMoreProjects(updatedProjects.length < totalCount);
                            return updatedProjects;
                        });
                        setProjectPage(currentPage + 1);

                    } catch (err) {
                        console.error('Error loading projects:', err);
                        setError(err);
                    } finally {
                        setLoadingProjects(false);
                    }
                })();
                return prevHasMore;
            });
            return true; // Set loading to true
        });
    }, []); // Empty dependency array makes this callback stable

    const loadMoreProjects = useCallback(() => {
        if (!loadingProjects && hasMoreProjects) {
            loadProjects(projectPage);
        }
    }, [loadingProjects, hasMoreProjects, projectPage, loadProjects]);

    const observer = useRef();
    const lastProjectElementRef = useCallback(node => {
        if (loadingProjects) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMoreProjects) {
                loadMoreProjects();
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingProjects, hasMoreProjects, loadMoreProjects]);

    const refreshProjects = useCallback(() => {
        setProjects([]);
        setProjectPage(1);
        setHasMoreProjects(true);
        loadProjects(1, true);
    }, [loadProjects]);

    const addProject = useCallback((newProject) => {
        setProjects(prevProjects => [newProject, ...prevProjects]);
    }, []);

    const deleteProject = useCallback((projectId) => {
        setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    }, []);

    // Initial load of projects when the provider mounts and user is authenticated
    useEffect(() => {
        if (isAuthenticated) {
            refreshProjects();
        }
    }, [isAuthenticated, refreshProjects]);

    const value = useMemo(() => ({
        projects,
        loadingProjects,
        error,
        hasMoreProjects,
        projectPage,
        loadProjects,
        loadMoreProjects,
        refreshProjects,
        addProject,
        deleteProject,
        lastProjectElementRef
    }), [
        projects,
        loadingProjects,
        error,
        hasMoreProjects,
        projectPage,
        loadProjects,
        loadMoreProjects,
        refreshProjects,
        addProject,
        deleteProject,
        lastProjectElementRef
    ]);

    return (
        <ProjectsContext.Provider value={value}>
            {children}
        </ProjectsContext.Provider>
    );
};

export const useProjects = () => {
    const context = useContext(ProjectsContext);
    if (context === undefined) {
        throw new Error('useProjects must be used within a ProjectsProvider');
    }
    return context;
};